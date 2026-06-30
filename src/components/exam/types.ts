import type { QuestionDTO } from "@jteban1/shared";

export type ExamTab = "reading" | "writing";

/** Local answer model, keyed by question id. */
export interface AnswerState {
  selectedKey?: string;
  text?: string;
}
export type AnswersMap = Record<number, AnswerState>;

export interface ReadingSectionProps {
  questions: QuestionDTO[];
  answers: AnswersMap;
  updateMcq: (questionId: number, key: string) => void;
  setActiveTab: (tab: ExamTab) => void;
}

export interface WritingSectionProps {
  questions: QuestionDTO[];
  answers: AnswersMap;
  updateTopic: (questionId: number, key: string) => void;
  updateText: (questionId: number, text: string) => void;
  wordCount: (text: string) => number;
  setShowSubmitModal: (show: boolean) => void;
  setActiveTab: (tab: ExamTab) => void;
}
