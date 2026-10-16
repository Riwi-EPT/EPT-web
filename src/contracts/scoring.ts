// Scoring model: CEFR levels, cut-off ladders and per-version scoring config.

import type { Skill } from "./core.js";

/** CEFR level, lowest to highest. */
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** Which backend produced a writing task's score. "heuristic" marks a provisional result. */
export type WritingGrader = "openai" | "heuristic";

/** One rung of a CEFR ladder: a ratio in [0, 1] at or above `min` maps to `level`. */
export interface CefrCutoff {
  min: number;
  level: CefrLevel;
}

/**
 * Per-version scoring configuration. Every field is optional when stored on a
 * version (missing fields fall back to the server defaults); the server always
 * resolves it to a complete config before grading.
 */
export interface VersionScoringConfig {
  /** CEFR ladder per skill, highest rung first. */
  cutoffs: Partial<Record<Skill, CefrCutoff[]>>;
  /** Relative weight of each skill in the overall CEFR and band (default equal). */
  weights: Partial<Record<Skill, number>>;
  /** How skill levels combine into the overall level. */
  overallRule: "weighted";
  /** Overall level may exceed the weakest skill by at most this many levels; null = no cap. */
  maxAboveWeakest: number | null;
  /** False for versions that cannot place anyone: results carry scores but no CEFR or band. */
  issuesLevel: boolean;
}
