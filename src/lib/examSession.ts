import { setExamToken } from "../api";

// Per-session exam context derived from the URL + storage. Centralized here so the
// App container and screens share one source instead of recomputing it.

const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
export const isLtiMode = params.get("lti") === "1";

// LTI runs in an iframe → sessionStorage (per-tab); self-service → localStorage.
export const storage: Storage =
  typeof window !== "undefined" ? (isLtiMode ? sessionStorage : localStorage) : localStorage;

const globalSavedVersion =
  typeof window !== "undefined" ? storage.getItem("riwi_active_exam_version") : null;
const rawVersion = (params.get("version") || globalSavedVersion || "A").toUpperCase();
export const examVersion = ["A", "B", "C", "D"].includes(rawVersion) ? rawVersion : "A";

const storagePrefix = `riwi_v_${examVersion.toLowerCase()}_`;
export const keys = {
  student: `${storagePrefix}student`,
  answers: `${storagePrefix}answers`,
  result: `${storagePrefix}result`,
};
// NOTE: there is deliberately no `timer` key any more. The countdown used to be
// mirrored here every tick, which made the clock a browser fact — editing one
// value bought unlimited time. The remaining time now comes from
// POST /api/exam/start, which resumes the server's record on reload. A local
// mirror could now only disagree with the server, and only to a student's
// detriment (a stale value shortening a resumed clock).

/**
 * Fallback only, for the pre-start login screen and for an API too old to report a
 * duration. The real value is per-version and comes from the server: `ExamDTO
 * .durationSeconds` for display, `remainingSeconds` from /api/exam/start for the
 * countdown that is actually enforced.
 */
export const EXAM_DURATION_SECONDS = 3600;
// The anti-cheat email block is server-side now (see api.ts checkBlockStatus/
// reportBlock) — no local BLOCKED_KEY. ATTEMPTS_KEY remains a local, this-device
// retake-attempt counter, unrelated to the block.
export const ATTEMPTS_KEY = "riwi_placement_attempts_v1";

// Capture the exam token handed over by the LTI launch (issue #9). It rides in the
// URL fragment (#token=...); store it for the session, then scrub it from the
// address bar so it isn't left in history. Runs once on import (before App renders).
if (typeof window !== "undefined" && isLtiMode && window.location.hash.startsWith("#token=")) {
  const token = decodeURIComponent(window.location.hash.slice("#token=".length));
  if (token) {
    setExamToken(token);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}
