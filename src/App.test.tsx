import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import type { ExamDTO, ResultDTO, SubmitRequest } from "@jteban1/shared";

// Mock the API module: keep the real ApiError (App uses `instanceof`), stub the
// network calls. examSession.ts imports `setExamToken` from the same module, so
// it resolves to this mock too — harmless here.
const fetchExam = vi.fn();
const submitExam = vi.fn();
vi.mock("./api", async (importActual) => {
  const actual = await importActual<typeof import("./api")>();
  return {
    ...actual,
    fetchExam: (...args: unknown[]) => fetchExam(...args),
    submitExam: (...args: unknown[]) => submitExam(...args),
    decodeExamToken: () => null,
  };
});

// Version-prefixed storage keys mirror lib/examSession.ts (version "A" by default).
const K = {
  student: "riwi_v_a_student",
  answers: "riwi_v_a_answers",
  timer: "riwi_v_a_timer_v1",
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
function seedInProgressExam(store: Storage, secondsLeft: number) {
  store.setItem(K.student, STUDENT);
  store.setItem(K.answers, JSON.stringify({}));
  store.setItem(K.timer, String(secondsLeft));
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
