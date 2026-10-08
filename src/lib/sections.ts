import type { QuestionDTO } from "@riwi-ept/shared";
import type { ExamTab } from "../components/exam/types";

/** The order sections are taken in. Listening is optional per version. */
export const SECTION_ORDER: readonly ExamTab[] = ["reading", "listening", "writing"];

export const SECTION_LABEL: Record<ExamTab, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
};

/** Questions grouped by skill, each list in served (position, id) order. */
export function groupBySkill(questions: QuestionDTO[] = []): Record<ExamTab, QuestionDTO[]> {
  const out: Record<ExamTab, QuestionDTO[]> = { reading: [], listening: [], writing: [] };
  for (const q of questions) out[q.skill]?.push(q);
  return out;
}

/**
 * Sections this version actually has. Reading and writing are always shown, as
 * before; listening only when the version has listening questions.
 */
export function presentSections(bySkill: Record<ExamTab, QuestionDTO[]>): ExamTab[] {
  return SECTION_ORDER.filter((s) => s !== "listening" || bySkill.listening.length > 0);
}

/** The section after `tab`, or null when `tab` is the last one. */
export function nextSection(sections: ExamTab[], tab: ExamTab): ExamTab | null {
  const i = sections.indexOf(tab);
  return i >= 0 && i < sections.length - 1 ? sections[i + 1] : null;
}
