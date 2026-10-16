// Exam submission payload.

export interface StudentInfo {
  name: string;
  email: string;
  date?: string;
  teacher?: string;
  /**
   * @deprecated Client-supplied and no longer trusted. The server stamps its own
   * start time on the attempt at POST /api/exam/start; this field is ignored when
   * deciding anything about the time limit.
   */
  startedAt?: string | null;
  ltiMode?: boolean;
}

/** One answer from the student, keyed by the question's DB id. */
export interface AnswerInput {
  questionId: number;
  /** MCQ choice, or the chosen essay topic key. */
  selectedKey?: string;
  /** Essay free-text response. */
  text?: string;
}

export interface SubmitRequest {
  versionCode: string;
  info: StudentInfo;
  answers: AnswerInput[];
  /**
   * The handle from POST /api/exam/start. Carries the deadline the server grades
   * against; `answers` above is only a fallback for questions whose autosave did
   * not land, and only when the request itself arrives in time.
   */
  attemptToken?: string;
}
