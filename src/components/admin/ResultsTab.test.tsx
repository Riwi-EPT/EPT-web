import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AdminAttemptDetailDTO, AdminResultRowDTO } from "@riwi-ept/shared";
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
  reading: { score: 8, max: 10, percentage: 80 },
  writing: {
    score: 6,
    max: 10,
    tasks: [
      { questionId: 5, number: 1, score: 6, max: 10, cefr: "B1", feedback: "Good structure.", corrections: "" },
    ],
  },
  overall: { score: 14, max: 20, percentage: 70, cefr: "B1", band: 3 },
  summary: "Solid B1.",
};

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
});
