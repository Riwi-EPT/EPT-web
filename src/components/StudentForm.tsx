import React, { useState, useEffect, useRef } from "react";
import { Award } from "lucide-react";
import { StudentInfo } from "../types";
import { isValidEmail } from "../lib/format";
import { checkBlockStatus } from "../api";
import { ATTEMPTS_KEY, EXAM_DURATION_SECONDS } from "../lib/examSession";
import ExamBanner from "./login/ExamBanner";
import StudentFields from "./login/StudentFields";
import GuidelinesPanel from "./login/GuidelinesPanel";
import CooldownNotices from "./login/CooldownNotices";

// Self-service (anonymous, non-LTI) retake cooldown. This is a local, this-device
// guard only — the authoritative cooldown for LTI identities is enforced server-side
// (see EPT-api middleware/retakeCooldown). Kept for the anonymous flow, which has no
// trusted identity to gate on the server.
const SELF_SERVICE_COOLDOWN_MS = 72 * 60 * 60 * 1000;

interface StudentFormProps {
  onStart: (info: StudentInfo) => void;
  currentVersion: string;
  /** This version's length, from the fetched exam. Falls back when not yet loaded. */
  durationSeconds?: number;
}

export default function StudentForm({
  onStart,
  currentVersion,
  durationSeconds,
}: StudentFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teacher, setTeacher] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Cooldown & attempt tracking (local, this-device — unrelated to the block).
  const [cooldownTime, setCooldownTime] = useState<number | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const checkEmailAttempts = (currentEmail: string) => {
    const normalizedEmail = currentEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setCooldownTime(null);
      setAttemptsCount(0);
      return;
    }

    const stored = localStorage.getItem(ATTEMPTS_KEY);
    if (stored) {
      const records = JSON.parse(stored);
      const userRecord = records[normalizedEmail];
      if (userRecord) {
        setAttemptsCount(userRecord.attempts);
        const lastAttempt = new Date(userRecord.lastAttemptAt).getTime();
        const elapsed = Date.now() - lastAttempt;
        setCooldownTime(elapsed < SELF_SERVICE_COOLDOWN_MS ? SELF_SERVICE_COOLDOWN_MS - elapsed : null);
        return;
      }
    }
    setCooldownTime(null);
    setAttemptsCount(0);
  };

  useEffect(() => {
    checkEmailAttempts(email);
  }, [email]);

  // Anti-cheat block: server-side now (see api.ts). Debounced-by-effect on `email`;
  // the `latestRequest` ref discards a response if a newer request has since been
  // issued (the user kept typing), so a slow/out-of-order reply can't overwrite
  // fresher state.
  const latestRequest = useRef(0);
  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setIsBlocked(false);
      return;
    }
    const requestId = ++latestRequest.current;
    checkBlockStatus(normalizedEmail)
      .then(({ blocked }) => {
        if (latestRequest.current === requestId) setIsBlocked(blocked);
      })
      .catch(() => {
        // Network hiccup: fail open rather than lock the form on a transient error.
        if (latestRequest.current === requestId) setIsBlocked(false);
      });
  }, [email]);

  useEffect(() => {
    if (cooldownTime === null) return;
    const interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev === null || prev <= 1000) {
          clearInterval(interval);
          return null;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    // Local bookkeeping only — NOT the exam start time. The server stamps that at
    // POST /api/exam/start; a client-supplied start time is not trusted.
    const registeredAt = new Date().toISOString();

    const info: StudentInfo = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      date,
      teacher: teacher.trim() || "N/A",
      startedAt: null,
    };

    // Record the attempt registration (this-device).
    const stored = localStorage.getItem(ATTEMPTS_KEY);
    const records = stored ? JSON.parse(stored) : {};
    const prevRecord = records[info.email];
    records[info.email] = {
      name: info.name,
      email: info.email,
      attempts: prevRecord ? prevRecord.attempts + 1 : 1,
      lastAttemptAt: registeredAt,
    };
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(records));

    onStart(info);
  };

  const canStart =
    name.trim().length > 0 && isValidEmail(email) && agreeTerms && cooldownTime === null && !isBlocked;

  return (
    <div className="max-w-2xl mx-auto my-12" id="student-onboarding-container">
      <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <ExamBanner />

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <StudentFields
            name={name}
            email={email}
            teacher={teacher}
            date={date}
            onName={setName}
            onEmail={setEmail}
            onTeacher={setTeacher}
            onDate={setDate}
            currentVersion={currentVersion}
            durationMinutes={Math.round((durationSeconds ?? EXAM_DURATION_SECONDS) / 60)}
          />

          <hr className="border-slate-150" />

          <GuidelinesPanel agreeTerms={agreeTerms} onAgreeChange={setAgreeTerms} />

          <CooldownNotices
            email={email}
            isBlocked={isBlocked}
            cooldownTime={cooldownTime}
            attemptsCount={attemptsCount}
          />

          <button
            id="start-assessment-button"
            type="submit"
            disabled={!canStart}
            className={`w-full py-3.5 px-6 rounded-lg font-sans font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all ${
              canStart
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 hover:shadow-md active:scale-98"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            }`}
          >
            <Award size={16} />
            Start Placement Test
          </button>
        </form>
      </div>
    </div>
  );
}
