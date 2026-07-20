import type { AdminQuestionDTO, AdminVersionDTO } from "@jteban1/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// Local mirror of the API's user shape (issue #10). Kept local until it's promoted
// into @jteban1/shared; see riwi-api/src/db/users.ts (AdminUserDTO).
export interface AdminUserDTO {
  id: number;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
}

export interface AdminSession {
  authenticated: boolean;
  isAdmin: boolean;
  email: string | null;
}

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
export const adminLogin = (email: string, password: string) =>
  req<{ ok: true; isAdmin: boolean; email: string }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const adminLogout = () => req<{ ok: true }>("/api/admin/logout", { method: "POST" });
export const adminSession = () => req<AdminSession>("/api/admin/session");

// ── Users (admin-only) ────────────────────────────────────────────────────────
export const listUsers = () => req<AdminUserDTO[]>("/api/admin/users");
export const createUser = (email: string, password: string, isAdmin: boolean) =>
  req<AdminUserDTO>("/api/admin/users", { method: "POST", body: JSON.stringify({ email, password, isAdmin }) });
export const updateUser = (
  id: number,
  patch: { isActive?: boolean; isAdmin?: boolean; password?: string }
) => req<{ ok: true }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

// ── Versions ──────────────────────────────────────────────────────────────────
export const listVersions = () => req<AdminVersionDTO[]>("/api/admin/versions");
export const createVersion = (code: string, name: string) =>
  req<AdminVersionDTO>("/api/admin/versions", { method: "POST", body: JSON.stringify({ code, name }) });
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
