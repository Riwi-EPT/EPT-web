import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import type { ExamDTO, ResultDTO, SubmitRequest } from "@riwi-ept/shared";

// Mock the API module: keep the real ApiError (App uses `instanceof`), stub the
// network calls. examSession.ts imports `setExamToken` from the same module, so
// it resolves to this mock too — harmless here.
const fetchExam = vi.fn();
const submitExam = vi.fn();
const checkBlockStatus = vi.fn();
const reportBlock = vi.fn();
const startAttempt = vi.fn();
const saveAnswers = vi.fn();
const getAttemptToken = vi.fn();
vi.mock("./api", async (importActual) => {
  const actual = await importActual<typeof import("./api")>();
  return {
    ...actual,
    fetchExam: (...args: unknown[]) => fetchExam(...args),
    submitExam: (...args: unknown[]) => submitExam(...args),
    decodeExamToken: () => null,
    checkBlockStatus: (...args: unknown[]) => checkBlockStatus(...args),
    reportBlock: (...args: unknown[]) => reportBlock(...args),
    startAttempt: (...args: unknown[]) => startAttempt(...args),
    saveAnswers: (...args: unknown[]) => saveAnswers(...args),
    getAttemptToken: () => getAttemptToken(),
  };
});

// Version-prefixed storage keys mirror lib/examSession.ts (version "A" by default).
// NOTE: there is no timer key any more — the remaining time comes from the server
// (POST /api/exam/start), so these tests drive the clock via startAttempt.
const K = {
  student: "riwi_v_a_student",
  answers: "riwi_v_a_answers",
};

const EXAM: ExamDTO = {
  versionCode: "A",
  versionName: "Version A",
  questions: [
    {
      id: 101,
      skill: "writing",
      type: "essay",
      number: 1,
      prompt: "Describe your last holiday.",
      passageText: null,
      wordMin: 5,
      wordMax: 100,
      maxPoints: 20,
      options: [],
    },
  ],
};

const RESULT: ResultDTO = {
  studentInfo: { name: "Ada", email: "ada@x.co" },
  reading: { score: 0, max: 0, percentage: 0 },
  writing: { score: 10, max: 20, tasks: [] },
  overall: { score: 10, max: 20, percentage: 50, cefr: "B1", band: 6 },
  summary: "ok",
};

const STUDENT = JSON.stringify({
  name: "Ada", email: "ada@x.co", date: "2026-07-19", teacher: "N/A", startedAt: "2026-07-19T00:00:00Z",
});

// Boot App straight into an in-progress exam so the countdown auto-resumes without
// going through the login form. `store` is localStorage (self-service) or
// sessionStorage (LTI), matching lib/examSession's storage selection.
//
// The remaining time is supplied by the mocked startAttempt, mirroring production:
// App resumes the *server's* clock on mount rather than trusting local storage.
function seedInProgressExam(store: Storage, secondsLeft: number) {
  store.setItem(K.student, STUDENT);
  store.setItem(K.answers, JSON.stringify({}));
  startAttempt.mockResolvedValue({
    attemptId: 1,
    attemptToken: "attempt.jwt.sig",
    expiresAt: new Date(Date.now() + secondsLeft * 1000).toISOString(),
    remainingSeconds: secondsLeft,
  });
}

// Resolve queued microtasks (e.g. the mocked fetchExam().then(setExamData)).
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

// Load a fresh App with the given URL so lib/examSession recomputes isLtiMode /
// storage / version from window.location at import time.
async function loadAppAt(url: string) {
  window.history.replaceState(null, "", url);
  vi.resetModules();
  return (await import("./App")).default;
}

describe("App auto-submit (P0-1 regression)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchExam.mockReset().mockResolvedValue(EXAM);
    submitExam.mockReset().mockResolvedValue(RESULT);
    checkBlockStatus.mockReset().mockResolvedValue({ blocked: false });
    reportBlock.mockReset().mockResolvedValue({ ok: true });
    startAttempt.mockReset();
    saveAnswers.mockReset().mockResolvedValue({ ok: true, saved: 1, remainingSeconds: 600 });
    // No stored handle by default, so the autosave effect stays out of the way of
    // the behaviors under test here.
    getAttemptToken.mockReset().mockReturnValue(null);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("LTI tab-switch auto-submit sends the latest typed answers, not a stale snapshot", async () => {
    // LTI mode uses sessionStorage and force-submits on tab switch. This path's
    // effect deps exclude `answers`, so without the answersRef fix it would submit
    // an empty (stale-closure) snapshot.
    seedInProgressExam(sessionStorage, 600);
    const App = await loadAppAt("/?lti=1&version=A");
    render(<App />);
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /Part 2 . Writing/ }));
    fireEvent.change(screen.getByPlaceholderText(/Write your response here/), {
      target: { value: "My holiday was great." },
    });

    // Simulate the tab losing focus.
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const vis = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    hidden.mockRestore();
    vis.mockRestore();

    expect(submitExam).toHaveBeenCalledTimes(1);
    const payload = submitExam.mock.calls[0][0] as SubmitRequest;
    expect(payload.answers.find((a) => a.questionId === 101)?.text).toBe("My holiday was great.");
  });

  it("timer-expiry auto-submit sends the latest typed answers exactly once", async () => {
    seedInProgressExam(localStorage, 3);
    const App = await loadAppAt("/");
    render(<App />);
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /Part 2 . Writing/ }));
    fireEvent.change(screen.getByPlaceholderText(/Write your response here/), {
      target: { value: "Answer typed after the timer started." },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(submitExam).toHaveBeenCalledTimes(1);
    const payload = submitExam.mock.calls[0][0] as SubmitRequest;
    expect(payload.answers.find((a) => a.questionId === 101)?.text).toBe(
      "Answer typed after the timer started."
    );
  });
});

describe("App server-authoritative clock", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchExam.mockReset().mockResolvedValue(EXAM);
    submitExam.mockReset().mockResolvedValue(RESULT);
    checkBlockStatus.mockReset().mockResolvedValue({ blocked: false });
    reportBlock.mockReset().mockResolvedValue({ ok: true });
    startAttempt.mockReset();
    saveAnswers.mockReset().mockResolvedValue({ ok: true, saved: 1, remainingSeconds: 118 });
    getAttemptToken.mockReset().mockReturnValue(null);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the countdown the SERVER reports, ignoring any stale local value", async () => {
    // A leftover value from the deleted timer key must not influence anything.
    localStorage.setItem("riwi_v_a_timer_v1", "3599");
    seedInProgressExam(localStorage, 120); // server says 2 minutes left

    const App = await loadAppAt("/");
    render(<App />);
    await flush();

    expect(startAttempt).toHaveBeenCalled();
    // 02:00 from the server, not 59:59 from the stale local value.
    expect(screen.getByText(/02:00 remaining/)).toBeInTheDocument();
    expect(screen.queryByText(/59:59 remaining/)).not.toBeInTheDocument();
  });

  it("autosaves the typed answer after the debounce, with the attempt handle", async () => {
    getAttemptToken.mockReturnValue("attempt.jwt.sig");
    seedInProgressExam(localStorage, 600);

    const App = await loadAppAt("/");
    render(<App />);
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /Part 2 . Writing/ }));
    fireEvent.change(screen.getByPlaceholderText(/Write your response here/), {
      target: { value: "Autosave me." },
    });

    // Nothing sent yet — the save is debounced, not per-keystroke.
    expect(saveAnswers).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(saveAnswers).toHaveBeenCalledTimes(1);
    const sent = saveAnswers.mock.calls[0][0] as Array<{ questionId: number; text?: string }>;
    expect(sent.find((a) => a.questionId === 101)?.text).toBe("Autosave me.");
  });

  it("stops the exam when the server refuses a late save (409)", async () => {
    getAttemptToken.mockReturnValue("attempt.jwt.sig");
    seedInProgressExam(localStorage, 600);
    const { ApiError } = await import("./api");
    saveAnswers.mockRejectedValue(
      new ApiError(409, "Your exam time has run out.", { reason: "deadline_passed" })
    );

    const App = await loadAppAt("/");
    render(<App />);
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /Part 2 . Writing/ }));
    fireEvent.change(screen.getByPlaceholderText(/Write your response here/), {
      target: { value: "Too late." },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // The server's verdict overrides the local countdown: submit is triggered even
    // though the client still thought it had ~10 minutes.
    expect(submitExam).toHaveBeenCalledTimes(1);
  });
});

describe("App anti-cheat block (server-side)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchExam.mockReset().mockResolvedValue(EXAM);
    checkBlockStatus.mockReset().mockResolvedValue({ blocked: false });
    reportBlock.mockReset().mockResolvedValue({ ok: true });
    startAttempt.mockReset();
    saveAnswers.mockReset().mockResolvedValue({ ok: true, saved: 1, remainingSeconds: 600 });
    // No stored handle by default, so the autosave effect stays out of the way of
    // the behaviors under test here.
    getAttemptToken.mockReset().mockReturnValue(null);
  });

  it("reports the block to the server (not localStorage) when the anonymous student switches tabs", async () => {
    seedInProgressExam(localStorage, 600);
    const App = await loadAppAt("/");
    render(<App />);
    await flush();

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const vis = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    hidden.mockRestore();
    vis.mockRestore();

    expect(reportBlock).toHaveBeenCalledWith(
      "ada@x.co",
      "Ada",
      expect.stringContaining("pestaña")
    );
    // The old localStorage-based block map is gone — nothing should be written there.
    expect(localStorage.getItem("riwi_placement_blocked_emails_v1")).toBeNull();
  });

  it("checks the server on mount and blocks a resumed session if already blocked", async () => {
    checkBlockStatus.mockResolvedValue({ blocked: true });
    seedInProgressExam(localStorage, 600);
    const App = await loadAppAt("/");
    render(<App />);
    await flush();

    expect(checkBlockStatus).toHaveBeenCalledWith("ada@x.co");
    expect(await screen.findByText(/EXAMEN BLOQUEADO/i)).toBeInTheDocument();
  });
});
