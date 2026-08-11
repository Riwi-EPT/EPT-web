import type { AdminQuestionDTO, AdminVersionDTO } from "@riwi-ept/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body?.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  // Some endpoints return no JSON body
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const adminLogin = (password: string) =>
  req<{ ok: true }>("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
export const adminLogout = () => req<{ ok: true }>("/api/admin/logout", { method: "POST" });
export const adminSession = () => req<{ isAdmin: boolean }>("/api/admin/session");

// ── Versions ──────────────────────────────────────────────────────────────────
export const listVersions = () => req<AdminVersionDTO[]>("/api/admin/versions");
export const createVersion = (code: string, name: string, durationSeconds?: number) =>
  req<AdminVersionDTO>("/api/admin/versions", {
    method: "POST",
    body: JSON.stringify({ code, name, durationSeconds }),
  });
export const updateVersion = (
  id: number,
  fields: { code?: string; name?: string; durationSeconds?: number }
) =>
  req<{ ok: true }>(`/api/admin/versions/${id}`, {
    method: "PUT",
    body: JSON.stringify(fields),
  });
export const deleteVersion = (id: number) =>
  req<{ ok: true }>(`/api/admin/versions/${id}`, { method: "DELETE" });
export const activateVersion = (id: number) =>
  req<{ ok: true }>(`/api/admin/versions/${id}/activate`, { method: "POST" });

// ── Questions ──────────────────────────────────────────────────────────────────
export const listQuestions = (versionId: number) =>
  req<AdminQuestionDTO[]>(`/api/admin/questions?versionId=${versionId}`);
export const createQuestion = (q: AdminQuestionDTO) =>
  req<AdminQuestionDTO>("/api/admin/questions", { method: "POST", body: JSON.stringify(q) });
export const updateQuestion = (id: number, q: AdminQuestionDTO) =>
  req<{ ok: true }>(`/api/admin/questions/${id}`, { method: "PUT", body: JSON.stringify(q) });
export const deleteQuestion = (id: number) =>
  req<{ ok: true }>(`/api/admin/questions/${id}`, { method: "DELETE" });

// ── Exam-version import / export ───────────────────────────────────────────────
// These types mirror `riwi-api/src/db/examBundle.ts`. Duplicated rather than shared
// via @riwi-ept/shared, following the BlockedEmailDTO precedent below: admin-only
// shapes live on each side, so an admin feature doesn't force a publish of the shared
// package. Keep the two copies in step.

export const EXAM_BUNDLE_FORMAT_VERSION = 1;

export interface BundleOption {
  key: string;
  text: string;
  isCorrect: boolean;
}

export interface BundleQuestion {
  skill: string;
  type: string;
  number: number;
  position: number;
  prompt: string;
  passageText: string | null;
  rubric: string | null;
  wordMin: number | null;
  wordMax: number | null;
  maxPoints: number;
  options: BundleOption[];
}

export interface BundleVersion {
  code: string;
  name: string;
  durationSeconds: number;
  questions: BundleQuestion[];
}

/** The export/import file. Contains answer keys — see downloadJson.exportFilename. */
export interface ExamBundle {
  formatVersion: number;
  exportedAt: string;
  versions: BundleVersion[];
}

export interface ImportedVersionSummary {
  code: string;
  questionCount: number;
  /** Set when the code collided and was suffixed (e.g. "A" -> "A-2"). */
  renamedFrom?: string;
}

export const exportVersions = (codes: string[]) =>
  req<ExamBundle>(`/api/admin/versions/export?codes=${encodeURIComponent(codes.join(","))}`);

/** Imports as NEW versions; colliding codes are suffixed server-side. */
export const importVersions = (bundle: ExamBundle) =>
  req<{ imported: ImportedVersionSummary[] }>("/api/admin/versions/import", {
    method: "POST",
    body: JSON.stringify(bundle),
  });

// ── Anti-cheat blocked emails ──────────────────────────────────────────────────
export interface BlockedEmailDTO {
  id: number;
  email: string;
  name: string;
  reason: string;
  blockedAt: string;
}
export const listBlockedEmails = () => req<BlockedEmailDTO[]>("/api/admin/blocked-emails");
export const unblockEmail = (id: number) =>
  req<{ ok: true }>(`/api/admin/blocked-emails/${id}`, { method: "DELETE" });
