// Per-question pacing: one-at-a-time navigation and the optional per-question timer.

export interface StartQuestionRequest {
  attemptToken: string;
  questionId: number;
}

export interface StartQuestionResponse {
  /** ISO deadline for this question, or null when it's untimed. */
  questionExpiresAt: string | null;
  /** Server-computed remaining seconds for this question, or null when untimed. */
  remainingSeconds: number | null;
}

export interface QuestionProgressEntry {
  questionId: number;
  startedAt: string;
  expiresAt: string | null;
  autoAdvancedAt: string | null;
}

export interface QuestionProgressResponse {
  progress: QuestionProgressEntry[];
}
