import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AdminQuestionDTO } from "@riwi-ept/shared";
import QuestionForm from "./QuestionForm";

function mcqValue(): AdminQuestionDTO {
  return {
    versionId: 1,
    skill: "reading",
    type: "mcq",
    number: 1,
    prompt: "Pick one",
    passageText: "",
    rubric: "",
    wordMin: null,
    wordMax: null,
    maxPoints: 1,
    position: 0,
    options: [
      { key: "a", text: "one", isCorrect: true },
      { key: "b", text: "two", isCorrect: false },
    ],
  };
}

function renderForm(value: AdminQuestionDTO) {
  const onChange = vi.fn();
  render(<QuestionForm value={value} onChange={onChange} onSave={vi.fn()} onCancel={vi.fn()} />);
  return onChange;
}

describe("QuestionForm", () => {
  it("re-letters option keys sequentially when an option is added", () => {
    const onChange = renderForm(mcqValue());
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));

    const next = onChange.mock.calls[0][0] as AdminQuestionDTO;
    expect(next.options.map((o) => o.key)).toEqual(["a", "b", "c"]);
  });

  it("re-letters after a middle option is removed", () => {
    const value = mcqValue();
    value.options = [
      { key: "a", text: "one", isCorrect: true },
      { key: "b", text: "two", isCorrect: false },
      { key: "c", text: "three", isCorrect: false },
    ];
    const onChange = renderForm(value);

    // Remove the middle option (second remove button).
    fireEvent.click(screen.getAllByTitle("Remove option")[1]);
    const next = onChange.mock.calls[0][0] as AdminQuestionDTO;
    expect(next.options.map((o) => o.key)).toEqual(["a", "b"]);
    expect(next.options.map((o) => o.text)).toEqual(["one", "three"]);
  });

  it("marks exactly one option correct when a radio is selected", () => {
    const onChange = renderForm(mcqValue());
    fireEvent.click(screen.getAllByRole("radio")[1]);

    const next = onChange.mock.calls[0][0] as AdminQuestionDTO;
    expect(next.options.map((o) => o.isCorrect)).toEqual([false, true]);
  });
});
