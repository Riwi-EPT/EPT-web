import { describe, it, expect, beforeEach, vi } from "vitest";

// examSession derives its exports from window.location at import time, so each test
// sets the URL and re-imports the module fresh.
async function loadExamSessionAt(url: string) {
  window.history.replaceState(null, "", url);
  vi.resetModules();
  return import("./examSession");
}

describe("examSession", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("self-service (no lti): uses localStorage and reads the version from the query", async () => {
    const s = await loadExamSessionAt("/?version=c");
    expect(s.isLtiMode).toBe(false);
    expect(s.storage).toBe(localStorage);
    expect(s.examVersion).toBe("C");
  });

  it("falls back to version A for an unknown version code", async () => {
    const s = await loadExamSessionAt("/?version=Z");
    expect(s.examVersion).toBe("A");
  });

  it("LTI mode: uses sessionStorage, captures the fragment token, and scrubs the hash", async () => {
    const s = await loadExamSessionAt("/?lti=1&version=B#token=abc.def.ghi");
    expect(s.isLtiMode).toBe(true);
    expect(s.storage).toBe(sessionStorage);
    // Token persisted for the session (api.ts stores it under this key).
    expect(sessionStorage.getItem("ept_exam_token")).toBe("abc.def.ghi");
    // Fragment removed from the address bar so the token isn't left in history.
    expect(window.location.hash).toBe("");
  });
});
