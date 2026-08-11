import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { QuestionDTO } from "@riwi-ept/shared";
import QuestionNavigator from "./QuestionNavigator";

function q(id: number, number: number): QuestionDTO {
  return { id, skill: "reading", type: "mcq", number, prompt: `Prompt ${number}`, options: [], maxPoints: 1 };
}

const QUESTIONS = [q(1, 1), q(2, 2), q(3, 3)];

function renderQuestion(question: QuestionDTO, { isEditable }: { isEditable: boolean }) {
  return <div data-testid={`q-${question.id}`}>{isEditable ? "editable" : "read-only"}</div>;
}

describe("QuestionNavigator", () => {
  it("renders the live question as editable, at the correct position label", () => {
    render(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={0}
        questionSecondsLeft={null}
        onNext={vi.fn()}
        onFinish={vi.fn()}
        finishLabel="Finish"
        renderQuestion={renderQuestion}
      />
    );

    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("q-1")).toHaveTextContent("editable");
  });

  it("Back moves the LOCAL view index only, without calling onNext", () => {
    const onNext = vi.fn();
    render(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={1}
        questionSecondsLeft={null}
        onNext={onNext}
        onFinish={vi.fn()}
        finishLabel="Finish"
        renderQuestion={renderQuestion}
      />
    );

    // Starts on the live (furthest-reached) question, index 1.
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("q-1")).toHaveTextContent("read-only");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("Next from a past (non-live) question just catches back up — no onNext call", () => {
    const onNext = vi.fn();
    render(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={1}
        questionSecondsLeft={null}
        onNext={onNext}
        onFinish={vi.fn()}
        finishLabel="Finish"
        renderQuestion={renderQuestion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("Next from the LIVE (non-last) question calls onNext", () => {
    const onNext = vi.fn();
    render(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={0}
        questionSecondsLeft={null}
        onNext={onNext}
        onFinish={vi.fn()}
        finishLabel="Finish"
        renderQuestion={renderQuestion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("Next from the LAST question calls onFinish, not onNext", () => {
    const onNext = vi.fn();
    const onFinish = vi.fn();
    render(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={2}
        questionSecondsLeft={null}
        onNext={onNext}
        onFinish={onFinish}
        finishLabel="Submit Exam"
        renderQuestion={renderQuestion}
      />
    );

    expect(screen.getByRole("button", { name: /Submit Exam/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Submit Exam/ }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("shows the per-question countdown only when timed", () => {
    const { rerender } = render(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={0}
        questionSecondsLeft={null}
        onNext={vi.fn()}
        onFinish={vi.fn()}
        finishLabel="Finish"
        renderQuestion={renderQuestion}
      />
    );
    expect(screen.queryByText(/for this question/)).not.toBeInTheDocument();

    rerender(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={0}
        questionSecondsLeft={30}
        onNext={vi.fn()}
        onFinish={vi.fn()}
        finishLabel="Finish"
        renderQuestion={renderQuestion}
      />
    );
    expect(screen.getByText(/00:30 for this question/)).toBeInTheDocument();
  });

  it("follows the live question forward when currentIndex advances, resetting the view", () => {
    const { rerender } = render(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={0}
        questionSecondsLeft={null}
        onNext={vi.fn()}
        onFinish={vi.fn()}
        finishLabel="Finish"
        renderQuestion={renderQuestion}
      />
    );
    rerender(
      <QuestionNavigator
        questions={QUESTIONS}
        currentIndex={1}
        questionSecondsLeft={null}
        onNext={vi.fn()}
        onFinish={vi.fn()}
        finishLabel="Finish"
        renderQuestion={renderQuestion}
      />
    );
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
  });
});
