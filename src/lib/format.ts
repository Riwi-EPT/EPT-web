import type { ApiError } from "../api";

/** Single email-shape check shared by the login form + validation. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function wordCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/** mm:ss for the exam countdown. */
export function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Human-readable remaining time for the server-side retake cooldown (issue #24). */
export function formatRemaining(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Live self-service cooldown countdown, to the second (ticks in the login form). */
export function formatCooldownRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours} hrs, ${minutes} min, ${seconds} sec`;
}

export function cooldownMessage(err: ApiError): string {
  const ms = (err.body as { remainingMs?: number } | null)?.remainingMs ?? 0;
  return `Ya presentaste el examen recientemente. Debes esperar ${formatRemaining(
    ms
  )} antes de volver a intentarlo.`;
}
