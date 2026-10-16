// Admin results table, per-identity history and attempt detail.

import type { ResultDTO } from "./result.js";

/** A section score as listed in the results table (null when the section is absent). */
export interface AdminSectionScoreDTO {
  score: number;
  max: number;
  percentage: number;
}

/** One submitted attempt in GET /api/admin/results. */
export interface AdminResultRowDTO {
  attemptId: number;
  name: string;
  email: string;
  ltiUserId: string | null;
  /** Groups attempts by person: the LTI user id when present, else the normalized email. */
  identity: string;
  versionCode: string;
  submittedAt: string;
  reading: AdminSectionScoreDTO | null;
  listening: AdminSectionScoreDTO | null;
  writing: AdminSectionScoreDTO | null;
  overallPercentage: number | null;
  cefr: string | null;
  band: number | null;
  /** True when a writing task was scored by the heuristic fallback. */
  provisional: boolean;
  /** How many submitted attempts share this row's identity. */
  attemptCount: number;
}

export interface AdminResultsPageDTO {
  rows: AdminResultRowDTO[];
  total: number;
  page: number;
  pageSize: number;
}

/** GET /api/admin/results/history — every attempt of one identity, oldest first. */
export interface AdminResultHistoryDTO {
  identity: string;
  attempts: AdminResultRowDTO[];
}

/** GET /api/admin/results/:attemptId — the full result, writing feedback included. */
export interface AdminAttemptDetailDTO extends ResultDTO {
  attemptId: number;
  identity: string;
  ltiUserId: string | null;
  versionCode: string;
  submittedAt: string;
}
