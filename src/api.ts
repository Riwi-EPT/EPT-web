import type { ExamDTO, ResultDTO, SubmitRequest } from "@jteban1/shared";

// In dev, requests are relative and proxied to the API by Vite. In production,
// set VITE_API_BASE_URL to the API origin (the API allows it via CORS).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchExam(version: string): Promise<ExamDTO> {
  return request<ExamDTO>(`/api/exam?version=${encodeURIComponent(version)}`);
}

export function submitExam(payload: SubmitRequest): Promise<ResultDTO> {
  return request<ResultDTO>(`/api/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface LtiSession {
  name: string;
  email: string;
  examVersion: string;
  teacher: string;
}

export function fetchLtiSession(): Promise<LtiSession> {
  return request<LtiSession>(`/api/lti/session`);
}
