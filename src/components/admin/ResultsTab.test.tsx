import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { AdminAttemptDetailDTO, AdminResultRowDTO, AdminResultsPageDTO } from "@riwi-ept/shared";
import ResultsTab from "./ResultsTab";

const listResults = vi.fn();
const getResultHistory = vi.fn();
const getResultDetail = vi.fn();
vi.mock("../../adminApi", () => ({
  listResults: (...args: unknown[]) => listResults(...args),
  getResultHistory: (...args: unknown[]) => getResultHistory(...args),
  getResultDetail: (...args: unknown[]) => getResultDetail(...args),
}));

const row = (attemptId: number, extra: Partial<AdminResultRowDTO> = {}): AdminResultRowDTO => ({
  attemptId,
  name: "Ana Pérez",
  email: "ana@example.com",
  ltiUserId: null,
  identity: "ana@example.com",
  versionCode: "A",
  submittedAt: "2026-10-01T10:00:00.000Z",
  reading: { score: 8, max: 10, percentage: 80 },
  listening: null,
  writing: { score: 6, max: 10, percentage: 60 },
  overallPercentage: 70,
  cefr: "B1",
  band: 3,
  provisional: false,
  attemptCount: 2,
  ...extra,
});

const DETAIL: AdminAttemptDetailDTO = {
  attemptId: 2,
  identity: "ana@example.com",
  ltiUserId: null,
  versionCode: "A",
  submittedAt: "2026-10-01T10:00:00.000Z",
  studentInfo: { name: "Ana Pérez", email: "ana@example.com" },
  reading: { score: 8, max: 10, percentage: 80, cefr: "B2", band: 4 },
  writing: {
    score: 6,
    max: 10,
    percentage: 60,
    cefr: "B1",
    band: 3,
    tasks: [
      {
        questionId: 5,
        number: 1,
        score: 6,
        max: 10,
        cefr: "B1",
        modelCefr: "B2",
        grader: "openai",
        feedback: "Good structure.",
        corrections: "",
      },
    ],
  },
  overall: { score: 14, max: 20, percentage: 70, cefr: "B1", band: 3 },
  provisional: false,
  scoringVersion: 2,
  summary: "Solid B1.",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("ResultsTab", () => {
  beforeEach(() => {
    listResults.mockReset().mockResolvedValue({ rows: [row(2)], total: 1, page: 1, pageSize: 25 });
    getResultHistory.mockReset().mockResolvedValue({
      identity: "ana@example.com",
      attempts: [row(1, { cefr: "A2" }), row(2)],
    });
    getResultDetail.mockReset().mockResolvedValue(DETAIL);
  });

  it("renders the result rows", async () => {
    render(<ResultsTab setError={vi.fn()} />);
    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(listResults).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
  });

  it("ignores an older results response after the filters change", async () => {
    const old = deferred<AdminResultsPageDTO>();
    listResults.mockReturnValueOnce(old.promise);
    render(<ResultsTab setError={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Search by name or email/), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
    await screen.findByText("ana@example.com");
    await act(async () => old.resolve({ rows: [row(1, { email: "stale@example.com" })], total: 1, page: 1, pageSize: 25 }));
    expect(screen.queryByText("stale@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });

  it("ignores failures from superseded results requests", async () => {
    const old = deferred<AdminResultsPageDTO>();
    const setError = vi.fn();
    listResults.mockReturnValueOnce(old.promise);
    render(<ResultsTab setError={setError} />);
    fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
    await screen.findByText("ana@example.com");
    await act(async () => old.reject(new Error("Stale failure")));
    expect(setError).not.toHaveBeenCalledWith("Stale failure");
  });

  it("reports the current results failure and recovers on another filter request", async () => {
    const setError = vi.fn();
    listResults.mockRejectedValueOnce(new Error("Results offline"));
    render(<ResultsTab setError={setError} />);
    await waitFor(() => expect(setError).toHaveBeenCalledWith("Results offline"));
    fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
    await screen.findByText("ana@example.com");
    expect(setError).toHaveBeenLastCalledWith(null);
  });

  it("keeps the most recently selected attempt when detail responses arrive out of order", async () => {
    const old = deferred<AdminAttemptDetailDTO>();
    listResults.mockResolvedValue({ rows: [row(1, { name: "Old candidate", email: "old@example.com" }), row(2)], total: 2, page: 1, pageSize: 25 });
    getResultDetail.mockReturnValueOnce(old.promise);
    render(<ResultsTab setError={vi.fn()} />);
    fireEvent.click(await screen.findByText("old@example.com"));
    fireEvent.click(screen.getByText("ana@example.com"));
    await waitFor(() => expect(screen.getByLabelText("Attempt detail")).toHaveTextContent("Good structure."));
    await act(async () => old.resolve({ ...DETAIL, studentInfo: { name: "Old candidate", email: "old@example.com" } }));
    expect(screen.getByLabelText("Attempt detail")).not.toHaveTextContent("Old candidate");
  });

  it("does not reopen a detail panel closed while its request was pending", async () => {
    const pending = deferred<AdminAttemptDetailDTO>();
    getResultDetail.mockReturnValueOnce(pending.promise);
    render(<ResultsTab setError={vi.fn()} />);
    fireEvent.click(await screen.findByText("ana@example.com"));
    fireEvent.click(screen.getByRole("button", { name: "Close detail" }));
    await act(async () => pending.resolve(DETAIL));
    expect(screen.queryByLabelText("Attempt detail")).not.toBeInTheDocument();
  });

  it("keeps the most recently selected candidate history", async () => {
    const old = deferred<{ identity: string; attempts: AdminResultRowDTO[] }>();
    listResults.mockResolvedValue({ rows: [row(1, { email: "old@example.com", identity: "old@example.com" }), row(2)], total: 2, page: 1, pageSize: 25 });
    getResultHistory.mockReturnValueOnce(old.promise);
    render(<ResultsTab setError={vi.fn()} />);
    await screen.findByText("old@example.com");
    fireEvent.click(screen.getAllByRole("button", { name: /2 intentos/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /2 intentos/ })[1]);
    await waitFor(() => expect(screen.getByLabelText("Attempt history")).toHaveTextContent("ana@example.com"));
    await act(async () => old.resolve({ identity: "old@example.com", attempts: [row(1)] }));
    expect(screen.getByLabelText("Attempt history")).not.toHaveTextContent("old@example.com");
  });

  it("ignores pending failures after the results tab unmounts", async () => {
    const pending = deferred<AdminResultsPageDTO>();
    const setError = vi.fn();
    listResults.mockReturnValueOnce(pending.promise);
    const { unmount } = render(<ResultsTab setError={setError} />);
    unmount();
    await act(async () => pending.reject(new Error("Late failure")));
    expect(setError).not.toHaveBeenCalledWith("Late failure");
  });

  it("does not reopen a history drawer closed while loading", async () => {
    const pending = deferred<{ identity: string; attempts: AdminResultRowDTO[] }>();
    getResultHistory.mockReturnValueOnce(pending.promise);
    render(<ResultsTab setError={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /2 intentos/ }));
    fireEvent.click(screen.getByRole("button", { name: "Close history" }));
    await act(async () => pending.resolve({ identity: "ana@example.com", attempts: [row(2)] }));
    expect(screen.queryByLabelText("Attempt history")).not.toBeInTheDocument();
  });

  it("ignores errors from a detail request after its panel closes", async () => {
    const pending = deferred<AdminAttemptDetailDTO>();
    const setError = vi.fn();
    getResultDetail.mockReturnValueOnce(pending.promise);
    render(<ResultsTab setError={setError} />);
    fireEvent.click(await screen.findByText("ana@example.com"));
    fireEvent.click(screen.getByRole("button", { name: "Close detail" }));
    await act(async () => pending.reject(new Error("Closed panel failed")));
    expect(setError).not.toHaveBeenCalledWith("Closed panel failed");
  });

  it("sends the filters on submit", async () => {
    render(<ResultsTab setError={vi.fn()} />);
    await screen.findByText("ana@example.com");
    fireEvent.change(screen.getByLabelText(/Search by name or email/), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
    await waitFor(() =>
      expect(listResults).toHaveBeenLastCalledWith({ q: "ana", page: 1, pageSize: 25 })
    );
  });

  it("opens the history drawer from the attempts badge", async () => {
    render(<ResultsTab setError={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /2 intentos/ }));

    const drawer = await screen.findByLabelText("Attempt history");
    expect(getResultHistory).toHaveBeenCalledWith("ana@example.com");
    expect(drawer).toHaveTextContent("#1");
    expect(drawer).toHaveTextContent("#2");
    expect(getResultDetail).not.toHaveBeenCalled();
  });

  it("opens the detail panel with writing feedback on row click", async () => {
    render(<ResultsTab setError={vi.fn()} />);
    fireEvent.click(await screen.findByText("ana@example.com"));

    const panel = await screen.findByLabelText("Attempt detail");
    expect(getResultDetail).toHaveBeenCalledWith(2);
    expect(panel).toHaveTextContent("Good structure.");
  });

  it("hides the Listening column when no listed attempt had listening", async () => {
    listResults.mockResolvedValue({ rows: [row(2)], total: 1, page: 1, pageSize: 25 });
    render(<ResultsTab setError={vi.fn()} />);
    await screen.findByText("ana@example.com");
    expect(screen.queryByRole("columnheader", { name: "Listening" })).not.toBeInTheDocument();
  });

  it("shows the Listening column when a listed attempt had listening", async () => {
    listResults.mockResolvedValue({
      rows: [row(2, { listening: { score: 1, max: 2, percentage: 50 } }), row(3)],
      total: 2,
      page: 1,
      pageSize: 25,
    });
    render(<ResultsTab setError={vi.fn()} />);
    await screen.findAllByText("ana@example.com");
    expect(screen.getByRole("columnheader", { name: "Listening" })).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("marks provisional rows in the list", async () => {
    listResults.mockResolvedValue({ rows: [row(2, { provisional: true })], total: 1, page: 1, pageSize: 25 });
    render(<ResultsTab setError={vi.fn()} />);
    await screen.findByText("ana@example.com");
    expect(screen.getByText("Provisional")).toBeInTheDocument();
  });

  it("shows grader, model CEFR and the provisional flag in the detail", async () => {
    getResultDetail.mockResolvedValue({ ...DETAIL, provisional: true });
    render(<ResultsTab setError={vi.fn()} />);
    fireEvent.click(await screen.findByText("ana@example.com"));

    const panel = await screen.findByLabelText("Attempt detail");
    expect(panel).toHaveTextContent("Provisional");
    expect(panel).toHaveTextContent("openai");
    expect(panel).toHaveTextContent("model B2");
    expect(panel).toHaveTextContent("CEFR B2 · band 4");
  });

  it("omits the task CEFR when the version issued none", async () => {
    const task = { ...DETAIL.writing!.tasks[0], cefr: null, modelCefr: null };
    getResultDetail.mockResolvedValue({
      ...DETAIL,
      reading: { ...DETAIL.reading, cefr: null, band: null },
      writing: { ...DETAIL.writing!, cefr: null, band: null, tasks: [task] },
      overall: { ...DETAIL.overall, cefr: null, band: null },
    });
    render(<ResultsTab setError={vi.fn()} />);
    fireEvent.click(await screen.findByText("ana@example.com"));

    const panel = await screen.findByLabelText("Attempt detail");
    expect(panel).toHaveTextContent("6/10");
    expect(panel).not.toHaveTextContent("null");
    expect(panel).not.toHaveTextContent(/CEFR/);
  });
});
