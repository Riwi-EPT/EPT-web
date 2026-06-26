import React, { useState, useEffect } from "react";
import { StudentInfo } from "../types";
import { User, Mail, Calendar, BookOpen, Clock, Award, ShieldAlert } from "lucide-react";

interface StudentFormProps {
  onStart: (info: StudentInfo) => void;
  currentVersion: string;
}

export default function StudentForm({ onStart, currentVersion }: StudentFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teacher, setTeacher] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Cooldown & attempt tracking
  const [cooldownTime, setCooldownTime] = useState<number | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const checkEmailAttempts = (currentEmail: string) => {
    const normalizedEmail = currentEmail.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setCooldownTime(null);
      setAttemptsCount(0);
      setIsBlocked(false);
      return;
    }

    // Check permanent block lists for cheating violations
    const blockedListStr = localStorage.getItem("riwi_placement_blocked_emails_v1");
    if (blockedListStr) {
      const blockedList = JSON.parse(blockedListStr);
      if (blockedList[normalizedEmail]) {
        setIsBlocked(true);
        setCooldownTime(null);
        setAttemptsCount(0);
        return;
      }
    }
    setIsBlocked(false);

    const stored = localStorage.getItem("riwi_placement_attempts_v1");
    if (stored) {
      const records = JSON.parse(stored);
      const userRecord = records[normalizedEmail];
      if (userRecord) {
        setAttemptsCount(userRecord.attempts);
        const lastAttempt = new Date(userRecord.lastAttemptAt).getTime();
        const rawDiff = Date.now() - lastAttempt;
        const cooldownPeriod = 72 * 60 * 60 * 1000; // 72 hours
        if (rawDiff < cooldownPeriod) {
          setCooldownTime(cooldownPeriod - rawDiff);
        } else {
          setCooldownTime(null);
        }
        return;
      }
    }
    setCooldownTime(null);
    setAttemptsCount(0);
  };

  useEffect(() => {
    checkEmailAttempts(email);
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

  const formatCooldown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours} hrs, ${minutes} min, ${seconds} sec`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const info: StudentInfo = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      date,
      teacher: teacher.trim() || "N/A",
      startedAt: new Date().toISOString(),
    };

    // Save/update the attempt registration to localStorage
    const stored = localStorage.getItem("riwi_placement_attempts_v1");
    const records = stored ? JSON.parse(stored) : {};
    const normalizedEmail = info.email;
    const prevRecord = records[normalizedEmail];

    records[normalizedEmail] = {
      name: info.name,
      email: normalizedEmail,
      attempts: prevRecord ? prevRecord.attempts + 1 : 1,
      lastAttemptAt: info.startedAt,
    };
    localStorage.setItem("riwi_placement_attempts_v1", JSON.stringify(records));

    onStart(info);
  };

  return (
    <div className="max-w-2xl mx-auto my-12" id="student-onboarding-container">
      <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden border-b border-slate-800">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-600 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-indigo-500 rounded-full opacity-10 blur-xl"></div>
          
          <div className="relative z-10 space-y-2">
            <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono tracking-widest rounded uppercase font-bold border border-indigo-500/30">
              Official Assessment Portal
            </span>
            <h1 className="text-3xl font-display font-bold text-white leading-tight tracking-tight pt-1">
              English Placement Test
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-lg font-sans">
              Interactive holistic placement test designed to measure Grammar, Reading, Listening, Writing, and Speaking capabilities (CEFR).
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Exam Version Selector */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  EXAMEN ACTIVO
                </span>
                <h2 className="text-sm font-bold text-slate-800 mt-1 font-sans">
                  Evaluando Versión del Examen: <span className="text-indigo-600 font-mono font-extrabold">{currentVersion}</span>
                </h2>
                <p className="text-slate-500 text-[11px] leading-relaxed font-sans mt-0.5">
                  La estructura técnica es idéntica en todas las versiones, pero las preguntas y lecturas varían.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-3xs">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[11px] font-mono font-bold text-slate-700">Versión {currentVersion} Activa</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Input Name */}
            <div className="space-y-2">
              <label htmlFor="student-name-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={15} />
                </div>
                <input
                  id="student-name-input"
                  type="text"
                  required
                  placeholder="e.g., Kate Acosta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 font-sans transition-all focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Input Email */}
            <div className="space-y-2">
              <label htmlFor="student-email-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={15} />
                </div>
                <input
                  id="student-email-input"
                  type="email"
                  required
                  placeholder="e.g., student@riwi.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 font-sans transition-all focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Input Teacher */}
            <div className="space-y-2">
              <label htmlFor="teacher-name-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Teacher or Observer
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <BookOpen size={15} />
                </div>
                <input
                  id="teacher-name-input"
                  type="text"
                  placeholder="e.g., Professor Martinez"
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 font-sans transition-all focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Input Date */}
            <div className="space-y-2">
              <label htmlFor="test-date-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Evaluation Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={15} />
                </div>
                <input
                  id="test-date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg text-slate-900 font-sans transition-all focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* General Info Tag */}
            <div className="bg-slate-50/70 rounded-lg p-4 border border-slate-100 flex items-start gap-3">
              <Clock className="text-indigo-600 shrink-0 mt-0.5" size={16} />
              <div>
                <h4 className="text-xs font-bold text-slate-700 font-sans">Official Time Limit</h4>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed font-sans">
                  You will have <strong>90 continuous minutes</strong> once the test starts. Upon timer expiration, your answers will be automatically submitted for grading.
                </p>
              </div>
            </div>

          </div>

          <hr className="border-slate-150" />

          {/* Guidelines */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Important Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 font-sans">
              <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
                <span className="font-bold text-slate-800 block mb-1">🎧 Interactive Listening</span>
                The system will utilize Text-to-Speech (TTS) to play the narrated transcripts. Please make sure your speakers/audio output is on.
              </div>
              <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
                <span className="font-bold text-slate-800 block mb-1">🎙️ Voice Speaking</span>
                You can dictate your spoken answers by tapping the microphone. The system will transcribe your speech in real-time.
              </div>
              <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
                <span className="font-bold text-slate-800 block mb-1">🤖 AI Grading</span>
                Your open-ended answers, compositions, and speaking transcriptions will be graded in detail to determine official CEFR proficiency levels.
              </div>
            </div>
          </div>

          <div className="border border-indigo-100 bg-indigo-50/30 rounded-lg p-4 flex items-start gap-3">
            <input
              id="agree-checkbox"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="agree-checkbox" className="text-xs text-slate-600 leading-relaxed select-none cursor-pointer font-sans">
              I have read the guidelines and certify that I will complete this test with academic integrity, individually, and without help from dictionaries, translators, or other people.
            </label>
          </div>

          {/* Cooldown and tracking feedback notices */}
          {email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && isBlocked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex items-start gap-3.5 text-red-900 animate-fade-in shadow-xs" id="cheater-permanently-blocked-warning">
              <ShieldAlert size={24} className="text-red-600 shrink-0 mt-0.5 animate-bounce" />
              <div className="space-y-1.5">
                <h4 className="text-xs font-black font-sans uppercase tracking-widest text-red-950 flex items-center gap-2">
                  <span>🔴 ACCESO BLOQUEADO PERMANENTEMENTE</span>
                </h4>
                <p className="text-[12px] text-red-700 leading-relaxed font-sans">
                  El correo electrónico <strong className="text-red-950 font-bold">{email}</strong> fue <strong>bloqueado definitivamente</strong> por nuestro sistema de detección y supervisión automatizado de RIWI.
                </p>
                <div className="bg-red-100/50 rounded-lg p-3 text-[11px] text-red-800 font-sans border border-red-200/50 leading-relaxed">
                  <strong>Razón del bloqueo:</strong> Se detectó que el estudiante intentó abrir otra pestaña, abandonar la ventana activa del examen o cambiar de aplicación mientras realizaba la prueba. Para preservar la pulcritud, honestidad y validez oficial del examen, esta cuenta ha sido anulada y <strong>no se permite volver a presentar la prueba</strong>.
                </div>
              </div>
            </div>
          )}

          {email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !isBlocked && cooldownTime !== null && (
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-5 flex items-start gap-3.5 text-rose-800 animate-fade-in">
              <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-rose-950">
                  Acceso Bloqueado por Cooldown (72 HORAS REQUERIDAS)
                </h4>
                <p className="text-[11px] text-rose-700 leading-relaxed font-sans">
                  El correo electrónico <strong className="text-rose-950 font-bold">{email}</strong> ya ha registrado una sesión anteriormente. Para mantener la integridad del proceso de evaluación, se implementa un intervalo mínimo obligatorio de <strong>72 horas</strong> antes de poder presentar el examen de nuevo.
                </p>
                <div className="pt-2 flex items-center gap-1.5 font-mono text-xs text-rose-600 font-bold">
                  <Clock size={16} className="text-rose-500 animate-pulse" />
                  <span>Tiempo restante para desbloquear: {formatCooldown(cooldownTime)}</span>
                </div>
              </div>
            </div>
          )}

          {email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !isBlocked && attemptsCount > 0 && cooldownTime === null && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4.5 flex items-start gap-3.5 text-emerald-800 animate-fade-in">
              <Award size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-emerald-950">
                  Acceso Habilitado (Cooldown de 72h Concluido)
                </h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-sans">
                  Has realizado <strong>{attemptsCount} intento(s)</strong> anteriormente con este correo electrónico. ¡Tu tiempo de espera ha concluido! Tienes acceso habilitado para realizar tu próximo intento del examen ahora mismo.
                </p>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            id="start-assessment-button"
            type="submit"
            disabled={!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !agreeTerms || cooldownTime !== null || isBlocked}
            className={`w-full py-3.5 px-6 rounded-lg font-sans font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all ${
              name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && agreeTerms && cooldownTime === null && !isBlocked
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
