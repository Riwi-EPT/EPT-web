import type { AudioAssetDTO, QuestionDTO, Skill } from "@riwi-ept/shared";

/** One tab per skill. Which ones a student sees depends on the version (see lib/sections). */
export type ExamTab = Skill;

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
  /** Furthest-reached (server-validated) question index within Reading. */
  currentIndex: number;
  /** Server-mirrored countdown for the live question, or null if untimed. */
  questionSecondsLeft: number | null;
  /** Advance past the live reading question (autosave + start the next one). */
  onNext: () => void;
  /** Next pressed on the last question: move to the next section. */
  onFinish: () => void;
  finishLabel: string;
}

export interface ListeningSectionProps extends ReadingSectionProps {
  /** Tracks referenced by these questions (from ExamDTO.audio). */
  audio: AudioAssetDTO[];
  /** Plays already spent per track in this attempt (server-reported). */
  audioPlays: Record<number, number>;
  onPlayRegistered: (audioId: number, playsUsed: number) => void;
}

export interface WritingSectionProps {
  questions: QuestionDTO[];
  answers: AnswersMap;
  updateTopic: (questionId: number, key: string) => void;
  updateText: (questionId: number, text: string) => void;
  wordCount: (text: string) => number;
  setShowSubmitModal: (show: boolean) => void;
  /** Furthest-reached (server-validated) question index within Writing. */
  currentIndex: number;
  /** Server-mirrored countdown for the live question, or null if untimed. */
  questionSecondsLeft: number | null;
  /** Advance past the live writing question (autosave + start the next one). */
  onNext: () => void;
}
