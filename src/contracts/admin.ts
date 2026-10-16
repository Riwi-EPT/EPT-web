// Admin CRUD contracts (authenticated; MAY include correct-answer data).

import type { QuestionType, Skill } from "./core.js";
import type { VersionScoringConfig } from "./scoring.js";

export interface AdminVersionDTO {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  /** Time limit for this version. Optional for back-compat; server default 3600. */
  durationSeconds?: number;
  /** Whether candidates get the fixed listening section. Optional for back-compat; server default false. */
  listeningEnabled?: boolean;
  /** Per-version scoring overrides; null/undefined = server defaults. */
  scoring?: Partial<VersionScoringConfig> | null;
}

export interface AdminOptionDTO {
  id?: number;
  key: string;
  text: string;
  isCorrect: boolean;
}

export interface AdminQuestionDTO {
  id?: number;
  versionId: number;
  skill: Skill;
  type: QuestionType;
  number: number;
  prompt: string;
  passageText?: string | null;
  rubric?: string | null;
  wordMin?: number | null;
  wordMax?: number | null;
  maxPoints: number;
  position?: number;
  /** Optional per-question pacing limit, in seconds. Null/undefined = untimed. */
  timeLimitSeconds?: number | null;
  options: AdminOptionDTO[];
}
