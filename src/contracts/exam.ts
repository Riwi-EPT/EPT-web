// Sanitized exam payload delivered to the browser.

import type { AudioAssetDTO } from "./audio.js";
import type { QuestionType, Skill } from "./core.js";

/** A selectable choice for an MCQ question, with no correctness flag. */
export interface OptionDTO {
  key: string;
  text: string;
}

/** A single exam question as delivered to the browser (sanitized). */
export interface QuestionDTO {
  id: number;
  skill: Skill;
  type: QuestionType;
  number: number;
  prompt: string;
  /** Reading passage attached to the question, if any. */
  passageText?: string | null;
  /** Essay tasks only: required word-count range. */
  wordMin?: number | null;
  wordMax?: number | null;
  maxPoints: number;
  /**
   * Optional per-question pacing limit, in seconds. Display only — for the
   * *authoritative* remaining time on this question, use `remainingSeconds`
   * from POST /api/exam/question/start. Null/undefined = untimed, bounded
   * only by the whole-exam clock.
   */
  timeLimitSeconds?: number | null;
  /** MCQ only: the options to choose from (no correctness flag). */
  options?: OptionDTO[];
}

/** The full sanitized exam payload for a given version. */
export interface ExamDTO {
  versionCode: string;
  versionName: string;
  questions: QuestionDTO[];
  /**
   * This version's time limit. Display only — for the *authoritative* remaining
   * time, use `remainingSeconds` from POST /api/exam/start. Optional so clients
   * older than 0.4.0 keep compiling.
   */
  durationSeconds?: number;
  /**
   * The fixed listening track, present only when the version has listening
   * enabled. Every listening question is about it. Metadata only — the bytes
   * are fetched from GET /api/exam/audio/:id after a play is registered.
   * Optional so clients older than 0.6.0 keep compiling.
   */
  audio?: AudioAssetDTO[];
}
