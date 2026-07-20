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
  timer: `${storagePrefix}timer_v1`,
  result: `${storagePrefix}result`,
};

export const EXAM_DURATION_SECONDS = 3600; // 60 minutes for Reading + Writing
export const BLOCKED_KEY = "riwi_placement_blocked_emails_v1";
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
