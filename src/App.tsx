import { useState, useEffect } from "react";
import StudentForm from "./components/StudentForm";
import ReviewTab from "./components/ReviewTab";
import AdminPanel from "./components/AdminPanel";
import ReadingSection from "./components/exam/ReadingSection";
import WritingSection from "./components/exam/WritingSection";
import type { ExamTab, AnswersMap } from "./components/exam/types";
import type { StudentInfo } from "./types";
import type { ExamDTO, ResultDTO, AnswerInput } from "@jteban1/shared";
import { fetchExam, fetchLtiSession, submitExam } from "./api";
import {
  AlarmClock, Send, ChevronRight, HelpCircle, GraduationCap,
  Sparkles, ShieldAlert, Settings, BookOpen, FileText,
} from "lucide-react";

const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
export const isLtiMode = params.get("lti") === "1";
const storage: Storage =
  typeof window !== "undefined" ? (isLtiMode ? sessionStorage : localStorage) : localStorage;
const globalSavedVersion =
  typeof window !== "undefined" ? storage.getItem("riwi_active_exam_version") : null;
const rawVersion = (params.get("version") || globalSavedVersion || "A").toUpperCase();
export const examVersion = ["A", "B", "C", "D"].includes(rawVersion) ? rawVersion : "A";
const storagePrefix = `riwi_v_${examVersion.toLowerCase()}_`;

const keys = {
  student: `${storagePrefix}student`,
  answers: `${storagePrefix}answers`,
  timer: `${storagePrefix}timer_v1`,
  result: `${storagePrefix}result`,
};

const EXAM_DURATION_SECONDS = 3600; // 60 minutes for Reading + Writing
const BLOCKED_KEY = "riwi_placement_blocked_emails_v1";

function wordCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export default function App() {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(() => {
    const saved = storage.getItem(keys.student);
    return saved ? JSON.parse(saved) : null;
  });
  const [answers, setAnswers] = useState<AnswersMap>(() => {
    const saved = storage.getItem(keys.answers);
    return saved ? JSON.parse(saved) : {};
  });
  const [examData, setExamData] = useState<ExamDTO | null>(null);
  const [examError, setExamError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ExamTab>("reading");
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const saved = storage.getItem(keys.timer);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return !isNaN(parsed) && parsed >= 0 ? parsed : EXAM_DURATION_SECONDS;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<ResultDTO | null>(() => {
    const saved = storage.getItem(keys.result);
    return saved ? JSON.parse(saved) : null;
  });

  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    if (isLtiMode) return false;
    const savedStudent = storage.getItem(keys.student);
    if (!savedStudent) return false;
    try {
      const info = JSON.parse(savedStudent);
      const blockedMap = JSON.parse(storage.getItem(BLOCKED_KEY) ?? "{}");
      return Boolean(info?.email && blockedMap[info.email.toLowerCase()]);
    } catch {
      return false;
    }
  });

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("riwi_reopen_admin") === "1") {
      sessionStorage.removeItem("riwi_reopen_admin");
      return true;
    }
    return false;
  });

  const [ltiLoading, setLtiLoading] = useState(isLtiMode && !studentInfo);
  const [ltiError, setLtiError] = useState<string | null>(null);

  // Load the sanitized exam from the API (no answer keys ever reach the client)
  useEffect(() => {
    fetchExam(examVersion)
      .then(setExamData)
      .catch(() => setExamError("Could not load the exam. Please try again later."));
  }, []);

  // LTI bootstrap: pull pre-filled identity from the server session
  useEffect(() => {
    if (!isLtiMode || studentInfo) return;
    fetchLtiSession()
      .then((data) =>
        handleStartExam({
          name: data.name,
          email: data.email,
          teacher: data.teacher,
          date: new Date().toISOString().split("T")[0],
          startedAt: null,
          ltiMode: true,
        })
      )
      .catch(() =>
        setLtiError("No se pudo conectar con Moodle. Vuelve a abrir el examen desde tu curso.")
      )
      .finally(() => setLtiLoading(false));
  }, []);

  // Persist progress
  useEffect(() => {
    if (studentInfo) storage.setItem(keys.student, JSON.stringify(studentInfo));
    else storage.removeItem(keys.student);
  }, [studentInfo]);
  useEffect(() => {
    storage.setItem(keys.answers, JSON.stringify(answers));
  }, [answers]);
  useEffect(() => {
    if (evaluationResult) storage.setItem(keys.result, JSON.stringify(evaluationResult));
    else storage.removeItem(keys.result);
  }, [evaluationResult]);
  useEffect(() => {
    if (studentInfo && !evaluationResult && !isBlocked) {
      storage.setItem(keys.timer, String(secondsLeft));
    }
  }, [secondsLeft, studentInfo, evaluationResult, isBlocked]);

  // Anti-cheat: tab/window switch
  useEffect(() => {
    if (!studentInfo || evaluationResult || isBlocked) return;
    const onVisibility = () => {
      if (document.hidden || document.visibilityState === "hidden") {
        if (isLtiMode) {
          setIsTimerRunning(false);
          handleSubmitTest();
          return;
        }
        const email = studentInfo.email.toLowerCase();
        const blockedMap = JSON.parse(storage.getItem(BLOCKED_KEY) ?? "{}");
        blockedMap[email] = {
          email,
          name: studentInfo.name,
          blockedAt: new Date().toISOString(),
          reason: "Abrió otra pestaña o abandonó la ventana del examen",
        };
        storage.setItem(BLOCKED_KEY, JSON.stringify(blockedMap));
        setIsTimerRunning(false);
        setIsBlocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [studentInfo, evaluationResult, isBlocked]);

  // Countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && studentInfo && !evaluationResult && !isBlocked) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            setIsTimerRunning(false);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, studentInfo, evaluationResult, isBlocked]);

  // Resume timer if logged in mid-exam
  useEffect(() => {
    if (studentInfo && !evaluationResult && !isTimerRunning && !isBlocked && secondsLeft > 0) {
      setIsTimerRunning(true);
    }
  }, [studentInfo, evaluationResult, isBlocked, secondsLeft]);

  const handleStartExam = (info: StudentInfo) => {
    if (!isLtiMode) {
      const blockedMap = JSON.parse(storage.getItem(BLOCKED_KEY) ?? "{}");
      if (blockedMap[info.email.toLowerCase()]) {
        setIsBlocked(true);
        return;
      }
    }
    setIsBlocked(false);
    setStudentInfo({ ...info, startedAt: new Date().toISOString() });
    setAnswers({});
    setSecondsLeft(EXAM_DURATION_SECONDS);
    storage.setItem(keys.timer, String(EXAM_DURATION_SECONDS));
    setIsTimerRunning(true);
    setActiveTab("reading");
  };

  const clearExamState = () => {
    setStudentInfo(null);
    setAnswers({});
    setEvaluationResult(null);
    setSecondsLeft(EXAM_DURATION_SECONDS);
    setIsTimerRunning(false);
    Object.values(keys).forEach((k) => storage.removeItem(k));
  };

  const handleExitBlockedState = () => {
    clearExamState();
    setIsBlocked(false);
  };

  const handleUnlockEmail = (email: string) => {
    const lower = email.trim().toLowerCase();
    try {
      const blockedMap = JSON.parse(storage.getItem(BLOCKED_KEY) ?? "{}");
      if (blockedMap[lower]) {
        delete blockedMap[lower];
        storage.setItem(BLOCKED_KEY, JSON.stringify(blockedMap));
      }
    } catch (e) {
      console.error(e);
    }
    if (studentInfo && studentInfo.email.toLowerCase() === lower) {
      setIsBlocked(false);
      setIsTimerRunning(true);
    }
  };

  const handleResetCooldown = (email: string) => {
    const lower = email.trim().toLowerCase();
    try {
      const attemptsMap = JSON.parse(storage.getItem("riwi_placement_attempts_v1") ?? "{}");
      if (attemptsMap[lower]) {
        delete attemptsMap[lower];
        storage.setItem("riwi_placement_attempts_v1", JSON.stringify(attemptsMap));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateMcq = (questionId: number, key: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], selectedKey: key } }));
  };
  const updateTopic = (questionId: number, key: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], selectedKey: key } }));
  };
  const updateText = (questionId: number, text: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], text } }));
  };

  const handleSubmitTest = async () => {
    if (!studentInfo) return;
    setIsGrading(true);
    setGradingProgress("Scoring Reading answers...");
    const t = setTimeout(() => setGradingProgress("Evaluating Writing with the local model..."), 2500);

    const answerList: AnswerInput[] = Object.entries(answers).map(([id, a]) => ({
      questionId: Number(id),
      selectedKey: a.selectedKey,
      text: a.text,
    }));

    try {
      const result = await submitExam({ versionCode: examVersion, info: studentInfo, answers: answerList });
      setEvaluationResult(result);
      setIsTimerRunning(false);
    } catch (error) {
      console.error(error);
      setErrorMessage("There was an error grading your exam. Please click submit again.");
    } finally {
      clearTimeout(t);
      setIsGrading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const readingQuestions = examData?.questions.filter((q) => q.skill === "reading") ?? [];
  const writingQuestions = examData?.questions.filter((q) => q.skill === "writing") ?? [];
  const readingAnswered = readingQuestions.filter((q) => answers[q.id]?.selectedKey).length;
  const writingAnswered = writingQuestions.filter((q) => (answers[q.id]?.text ?? "").trim()).length;

  // ── Gates ─────────────────────────────────────────────────────────────────
  if (ltiLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 font-sans text-slate-700">
        <GraduationCap size={44} className="text-slate-900 animate-pulse" />
        <p className="text-base font-medium">Conectando con Moodle...</p>
      </div>
    );
  }
  if (ltiError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 font-sans text-slate-700 px-6 text-center">
        <ShieldAlert size={44} className="text-rose-500" />
        <p className="text-base font-semibold text-rose-600">{ltiError}</p>
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <GraduationCap size={44} className="text-slate-900" />
          <StudentForm onStart={handleStartExam} currentVersion={examVersion} />
          <button
            onClick={() => setIsAdminOpen(true)}
            className="text-xs text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1 mt-4 font-sans font-bold uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-lg"
          >
            <Settings size={13} />
            Acceso Administrador (Docentes)
          </button>
        </div>
        {isAdminOpen && (
          <AdminPanel
            onClose={() => setIsAdminOpen(false)}
            onUnlockEmail={handleUnlockEmail}
            onResetCooldown={handleResetCooldown}
            currentVersion={examVersion}
          />
        )}
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
        <div className="max-w-xl space-y-8 bg-slate-900 border border-red-950 p-8 md:p-12 rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 mx-auto">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">EXAMEN BLOQUEADO</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            El sistema detectó que abandonaste la ventana del examen. El correo{" "}
            <strong className="text-white">{studentInfo.email}</strong> ha sido inhabilitado.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleExitBlockedState}
              className="px-6 py-3 bg-red-950 text-red-200 border border-red-900/50 hover:bg-red-900 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Registrar otro correo / Salir
            </button>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings size={14} />
              Desbloquear como Administrador
            </button>
          </div>
        </div>
        {isAdminOpen && (
          <AdminPanel
            onClose={() => setIsAdminOpen(false)}
            currentStudentEmail={studentInfo.email}
            onUnlockEmail={handleUnlockEmail}
            onResetCooldown={handleResetCooldown}
            currentVersion={examVersion}
          />
        )}
      </div>
    );
  }

  if (isGrading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
        <div className="max-w-md space-y-8">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <Sparkles size={32} className="text-indigo-400 animate-pulse" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black tracking-tight uppercase">Grading Your Exam</h2>
            <p className="text-xs font-mono text-indigo-300 uppercase tracking-wider h-8">{gradingProgress}</p>
          </div>
        </div>
      </div>
    );
  }

  if (evaluationResult) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans text-slate-800">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap size={20} className="text-indigo-600" />
            English Placement Test Results
          </h1>
          <ReviewTab result={evaluationResult} onReset={() => setShowResetModal(true)} />
        </div>
        {showResetModal && (
          <ConfirmModal
            title="Restart Your Exam?"
            body="This clears the current answers, credentials, and results from this device."
            confirmLabel="Yes, Clear & Restart"
            tone="rose"
            onCancel={() => setShowResetModal(false)}
            onConfirm={() => {
              clearExamState();
              setShowResetModal(false);
            }}
          />
        )}
      </div>
    );
  }

  // ── Exam ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-800 flex flex-col">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight leading-none text-xl">
                English Placement Test
              </h1>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mt-1.5">
                ACTIVE · <span className="text-slate-800 font-extrabold">{studentInfo.name}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-6">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 font-mono font-bold text-xs">
              <AlarmClock size={15} className="animate-pulse" />
              <span>{formatTimer(secondsLeft)} remaining</span>
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={12} />
              Submit Exam
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:grid md:grid-cols-12 gap-8">
        <nav className="md:col-span-3 space-y-2 mb-6 md:mb-0 md:sticky md:top-24 self-start">
          <h3 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-3 mb-3 block">
            TEST SECTIONS
          </h3>
          {([
            { id: "reading", label: "Part 1 — Reading", icon: <BookOpen size={14} />, n: 1 },
            { id: "writing", label: "Part 2 — Writing", icon: <FileText size={14} />, n: 2 },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left p-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${
                    activeTab === tab.id ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.n}
                </span>
                {tab.label}
              </span>
              <ChevronRight size={14} className={activeTab === tab.id ? "text-indigo-200" : "text-slate-400"} />
            </button>
          ))}

          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mt-6 text-xs text-slate-500 leading-relaxed space-y-2">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Progreso
            </div>
            <div>
              <strong>Reading:</strong> {readingAnswered}/{readingQuestions.length}
            </div>
            <div>
              <strong>Writing:</strong> {writingAnswered}/{writingQuestions.length}
            </div>
          </div>

          <button
            onClick={() => setIsAdminOpen(true)}
            className="w-full mt-4 flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
          >
            <Settings size={13} />
            Panel de Docente (Admin)
          </button>
        </nav>

        <main className="md:col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[32rem]">
          {examError && <div className="p-8 text-sm text-rose-600">{examError}</div>}
          {!examData && !examError && (
            <div className="p-8 text-sm text-slate-500">Loading exam…</div>
          )}
          {examData && activeTab === "reading" && (
            <ReadingSection
              questions={readingQuestions}
              answers={answers}
              updateMcq={updateMcq}
              setActiveTab={setActiveTab}
            />
          )}
          {examData && activeTab === "writing" && (
            <WritingSection
              questions={writingQuestions}
              answers={answers}
              updateTopic={updateTopic}
              updateText={updateText}
              wordCount={wordCount}
              setShowSubmitModal={setShowSubmitModal}
              setActiveTab={setActiveTab}
            />
          )}
        </main>
      </div>

      {showSubmitModal && (
        <ConfirmModal
          title="Submit Assessment"
          body="Are you sure you want to grade and complete your English Placement Test? This action is final."
          confirmLabel="Yes, Submit Exam"
          tone="emerald"
          onCancel={() => setShowSubmitModal(false)}
          onConfirm={() => {
            setShowSubmitModal(false);
            handleSubmitTest();
          }}
        />
      )}

      {errorMessage && (
        <ConfirmModal
          title="Notice"
          body={errorMessage}
          confirmLabel="Close"
          tone="slate"
          onConfirm={() => setErrorMessage(null)}
        />
      )}

      {isAdminOpen && (
        <AdminPanel
          onClose={() => setIsAdminOpen(false)}
          currentStudentEmail={studentInfo.email}
          onUnlockEmail={handleUnlockEmail}
          onResetCooldown={handleResetCooldown}
          currentVersion={examVersion}
        />
      )}
    </div>
  );
}

// Small shared confirmation/notice modal (bypasses iframe-blocked native dialogs).
function ConfirmModal({
  title,
  body,
  confirmLabel,
  tone,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  tone: "emerald" | "rose" | "slate";
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const toneClass = {
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    rose: "bg-rose-600 hover:bg-rose-700",
    slate: "bg-slate-900 hover:bg-slate-800",
  }[tone];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-6 space-y-3">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-600">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 text-left">{title}</h3>
          <p className="text-slate-500 text-xs leading-relaxed text-left">{body}</p>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${toneClass} text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
