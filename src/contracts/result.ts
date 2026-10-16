// Graded result returned to the candidate.

import type { CefrLevel, WritingGrader } from "./scoring.js";
import type { StudentInfo } from "./submission.js";

export interface WritingTaskResult {
  questionId: number;
  number: number;
  score: number;
  max: number;
  /** Derived from score/max with the version's writing cut-offs; null when the version issues no level. */
  cefr: CefrLevel | null;
  /** The model's own CEFR claim, kept for calibration only (null for the heuristic). */
  modelCefr: CefrLevel | null;
  grader: WritingGrader;
  feedback: string;
  corrections: string;
}

/** Score of one skill plus its own level. `cefr`/`band` are null when the version issues no level. */
export interface SectionResult {
  score: number;
  max: number;
  percentage: number;
  cefr: CefrLevel | null;
  band: number | null;
}

export interface ResultDTO {
  studentInfo: StudentInfo;
  reading: SectionResult;
  /** Present only when the version had listening questions. */
  listening?: SectionResult;
  writing: SectionResult & { tasks: WritingTaskResult[] };
  overall: {
    score: number;
    max: number;
    percentage: number;
    /** Null when the version issues no level. */
    cefr: CefrLevel | null;
    band: number | null;
  };
  /** True when any writing task fell back to the heuristic grader. */
  provisional: boolean;
  /**
   * Generation of the scoring model that produced this result (2 = per-skill levels).
   * Results persisted before the redesign lack this and the per-section level fields.
   */
  scoringVersion: number;
  summary: string;
}
