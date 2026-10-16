// Core enums: skills and question types.

export type Skill = "reading" | "listening" | "writing";
// Reading and listening are MCQ; writing is essay. (The "open" free-text reading type was built
// then reverted — removed here; grading is MCQ + essay only.)
export type QuestionType = "mcq" | "essay";
