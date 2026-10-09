import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ResultDTO } from "@riwi-ept/shared";
import ReviewTab from "./ReviewTab";

const base: ResultDTO = {
  studentInfo: { name: "Ada", email: "ada@x.co" },
  reading: { score: 8, max: 10, percentage: 80, cefr: "B2", band: 7 },
  writing: {
    score: 6,
    max: 10,
    percentage: 60,
    cefr: "B1",
    band: 5,
    tasks: [
      {
        questionId: 1,
        number: 1,
        score: 6,
        max: 10,
        cefr: "B1",
        modelCefr: "B2",
        grader: "heuristic",
        feedback: "Secret AI feedback",
        corrections: "Secret corrections",
      },
    ],
  },
  overall: { score: 14, max: 20, percentage: 70, cefr: "B1", band: 6 },
  provisional: false,
  scoringVersion: 2,
  summary: "ok",
};

describe("ReviewTab", () => {
  it("shows the overall level and a per-skill CEFR and band", () => {
    render(<ReviewTab result={base} onReset={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /Overall CEFR: B1/ })).toBeInTheDocument();
    expect(screen.getByText("CEFR B2 · band 7")).toBeInTheDocument();
    expect(screen.getByText("CEFR B1 · band 5")).toBeInTheDocument();
    expect(screen.queryByText(/provisional/i)).not.toBeInTheDocument();
  });

  it("hides the level when the version issues none", () => {
    const result: ResultDTO = {
      ...base,
      reading: { ...base.reading, cefr: null, band: null },
      writing: { ...base.writing, cefr: null, band: null },
      overall: { ...base.overall, cefr: null, band: null },
    };
    render(<ReviewTab result={result} onReset={vi.fn()} />);
    expect(screen.queryByText(/Overall CEFR/)).not.toBeInTheDocument();
    expect(screen.queryByText(/band/i)).not.toBeInTheDocument();
    expect(screen.getByText(/does not issue a CEFR level/)).toBeInTheDocument();
  });

  it("flags a provisional result without revealing the grader or feedback", () => {
    render(<ReviewTab result={{ ...base, provisional: true }} onReset={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(/Provisional result/);
    expect(screen.queryByText(/heuristic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Secret/)).not.toBeInTheDocument();
  });

  it("renders a legacy result without per-section levels", () => {
    const legacy = {
      ...base,
      reading: { score: 8, max: 10, percentage: 80 },
      writing: { score: 6, max: 10, tasks: [] },
    } as unknown as ResultDTO;
    delete (legacy as Partial<ResultDTO>).provisional;
    render(<ReviewTab result={legacy} onReset={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /Overall CEFR: B1/ })).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
