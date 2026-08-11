import type {
  AnswerInput,
  ExamDTO,
  ResultDTO,
  StartAttemptResponse,
  StudentInfo,
  SubmitRequest,
} from "@riwi-ept/shared";

// In dev, requests are relative and proxied to the API by Vite. In production,
// set VITE_API_BASE_URL to the API origin (the API allows it via CORS).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// ── Stateless exam auth (issue #9 / A1) ──────────────────────────────────────
// After an LTI launch the API hands the SPA a short-lived Bearer token in the URL
// fragment. We persist it for the browser session and send it on every exam call,
// so the exam works cross-origin with cookies disabled.
const TOKEN_KEY = "ept_exam_token";
let examToken: string | null =
  typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;

export function setExamToken(token: string): void {
  examToken = token;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* sessionStorage may be unavailable; keep the in-memory copy */
  }
}

export function getExamToken(): string | null {
  return examToken;
}

export function clearExamToken(): void {
  examToken = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export interface ExamTokenIdentity {
  ltiUserId: string;
  name: string;
  email: string;
  examVersion: string;
}

/**
 * Decode the display identity from the token payload for prefill. This does NOT
 * verify the signature (only the server does) — it's used purely for showing the
 * student's name/version in the UI.
 */
export function decodeExamToken(token: string | null = examToken): ExamTokenIdentity | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      decodeURIComponent(
        atob(b64)
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      )
    );
    return {
      ltiUserId: String(json.sub ?? ""),
      name: json.name ?? "",
      email: json.email ?? "",
      examVersion: json.examVersion ?? "A",
    };
  } catch {
    return null;
  }
}

/** Error carrying the HTTP status + parsed body (e.g. cooldown `remainingMs`). */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (examToken) headers.Authorization = `Bearer ${examToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON error body */
    }
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : text || `Request failed: ${res.status}`;
    throw new ApiError(res.status, message, body);
  }
  return res.json() as Promise<T>;
}

export function fetchExam(version: string): Promise<ExamDTO> {
  return request<ExamDTO>(`/api/exam?version=${encodeURIComponent(version)}`);
}

export function submitExam(payload: SubmitRequest): Promise<ResultDTO> {
  return request<ResultDTO>(`/api/submit`, {
    method: "POST",
    body: JSON.stringify({ ...payload, attemptToken: getAttemptToken() ?? undefined }),
  });
}

// ── Attempt handle (server-authoritative exam clock) ─────────────────────────
// Distinct from the exam token above: that one says who you are (LTI launch),
// this one says when you must finish (exam start). Session-scoped, because a
// clock is per-sitting; the in-memory mirror keeps things working if storage is
// blocked. Losing it is not a way to gain time — the server resumes the same
// attempt from its own record.

const ATTEMPT_TOKEN_KEY = "ept_attempt_token";
let attemptToken: string | null =
  typeof window !== "undefined" ? sessionStorage.getItem(ATTEMPT_TOKEN_KEY) : null;

export function setAttemptToken(token: string): void {
  attemptToken = token;
  try {
    sessionStorage.setItem(ATTEMPT_TOKEN_KEY, token);
  } catch {
    /* keep the in-memory copy */
  }
}

export function getAttemptToken(): string | null {
  return attemptToken;
}

export function clearAttemptToken(): void {
  attemptToken = null;
  try {
    sessionStorage.removeItem(ATTEMPT_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Start — or resume — an attempt, and get the authoritative remaining time.
 * Safe to call on every mount: the server returns the *existing* attempt when one
 * is still running, so a reload continues the clock instead of resetting it.
 * Stores the returned handle as a side effect.
 */
export async function startAttempt(
  versionCode: string,
  info: StudentInfo
): Promise<StartAttemptResponse> {
  const res = await request<StartAttemptResponse>(`/api/exam/start`, {
    method: "POST",
    body: JSON.stringify({ versionCode, info }),
  });
  setAttemptToken(res.attemptToken);
  return res;
}

/** Autosave. Each answer is stamped server-side; post-deadline writes are refused. */
export function saveAnswers(answers: AnswerInput[]): Promise<{
  ok: true;
  saved: number;
  remainingSeconds: number;
}> {
  const token = getAttemptToken();
  if (!token) return Promise.reject(new ApiError(0, "No attempt in progress.", null));
  return request(`/api/exam/answers`, {
    method: "PATCH",
    body: JSON.stringify({ attemptToken: token, answers }),
  });
}

// ── Anti-cheat email block (anonymous self-service flow) ────────────────────
// Server-side/durable version of the old localStorage block map. Still a
// self-reported signal keyed by a self-typed email — durable, not tamper-proof.

export function checkBlockStatus(email: string): Promise<{ blocked: boolean }> {
  return request<{ blocked: boolean }>(`/api/block/status?email=${encodeURIComponent(email)}`);
}

export function reportBlock(email: string, name: string, reason: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/api/block`, {
    method: "POST",
    body: JSON.stringify({ email, name, reason }),
  });
}
