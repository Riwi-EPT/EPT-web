import type { QuestionDTO } from "@riwi-ept/shared";

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
  /** Furthest-reached (server-validated) question index within Reading. */
  currentIndex: number;
  /** Server-mirrored countdown for the live question, or null if untimed. */
  questionSecondsLeft: number | null;
  /** Advance past the live reading question (autosave + start the next one). */
  onNext: () => void;
}

export interface WritingSectionProps {
  questions: QuestionDTO[];
  answers: AnswersMap;
  updateTopic: (questionId: number, key: string) => void;
  updateText: (questionId: number, text: string) => void;
  wordCount: (text: string) => number;
  setShowSubmitModal: (show: boolean) => void;
  setActiveTab: (tab: ExamTab) => void;
  /** Furthest-reached (server-validated) question index within Writing. */
  currentIndex: number;
  /** Server-mirrored countdown for the live question, or null if untimed. */
  questionSecondsLeft: number | null;
  /** Advance past the live writing question (autosave + start the next one). */
  onNext: () => void;
}
