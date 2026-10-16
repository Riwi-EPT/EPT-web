// Vendored from EPT-shared; keep identical between EPT-api and EPT-web.
// Shared DTOs used by both the API and the web SPA.
//
// IMPORTANT: nothing in the client-facing shapes here may carry correct-answer
// information. Correctness (`is_correct` / `correctKey`) lives only in the
// database and the server-side grading code, never in a type sent to the browser.
//
// Barrel: each module groups the contracts of one area; consumers import from the package root.

export type * from "./core.js";
export type * from "./scoring.js";
export type * from "./exam.js";
export type * from "./audio.js";
export type * from "./attempt.js";
export type * from "./questionProgress.js";
export type * from "./submission.js";
export type * from "./result.js";
export type * from "./admin.js";
export type * from "./adminResults.js";
