// Attempt lifecycle with a server-authoritative clock, including answer autosave.

import type { AnswerInput, StudentInfo } from "./submission.js";

export interface StartAttemptRequest {
  /**
   * Ignored when a verified exam token is present — the server uses the version
   * the token was minted for, so a client cannot swap versions for a fresh clock.
   */
  versionCode: string;
  info: StudentInfo;
}

export interface StartAttemptResponse {
  attemptId: number;
  /**
   * Signed handle carrying the attempt's deadline. Send it back on autosave and
   * submit. The server trusts this over anything else the client reports.
   */
  attemptToken: string;
  /** ISO deadline, for display/debug only. */
  expiresAt: string;
  /**
   * The only value the client should count down from: server-computed, so it is
   * immune to client clock skew. A resumed attempt returns what is actually left.
   */
  remainingSeconds: number;
}

/** Autosave payload: PATCH /api/exam/answers. */
export interface SaveAnswersRequest {
  attemptToken: string;
  answers: AnswerInput[];
}

export interface SaveAnswersResponse {
  ok: true;
  saved: number;
  remainingSeconds: number;
  /**
   * questionIds whose answer was NOT persisted this call because that
   * question's own per-question deadline had passed (the whole-exam deadline
   * is unaffected and still enforced as a hard 409 for the whole request).
   * Optional so older clients that ignore it keep working.
   */
  skippedQuestionIds?: number[];
}
