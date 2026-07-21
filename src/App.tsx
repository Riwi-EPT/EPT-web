import { useState, useEffect, useRef, type ReactNode } from "react";
import { GraduationCap, ShieldAlert } from "lucide-react";
import type { StudentInfo } from "./types";
import type { ExamDTO, ResultDTO, AnswerInput } from "@jteban1/shared";
import type { ExamTab, AnswersMap } from "./components/exam/types";
import { fetchExam, submitExam, decodeExamToken, checkBlockStatus, reportBlock, ApiError } from "./api";
import {
  isLtiMode, examVersion, storage, keys,
  EXAM_DURATION_SECONDS, ATTEMPTS_KEY,
} from "./lib/examSession";
import { cooldownMessage } from "./lib/format";
import ConfirmModal from "./components/ConfirmModal";
import AdminPanel from "./components/AdminPanel";
import StatusScreen from "./components/screens/StatusScreen";
import LoginScreen from "./components/screens/LoginScreen";
import BlockedScreen from "./components/screens/BlockedScreen";
import GradingScreen from "./components/screens/GradingScreen";
import ResultsScreen from "./components/screens/ResultsScreen";
import ExamShell from "./components/exam/ExamShell";

export default function App() {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(() => {
    const saved = storage.getItem(keys.student);
    return saved ? JSON.parse(saved) : null;
  });
  const [answers, setAnswers] = useState<AnswersMap>(() => {
    const saved = storage.getItem(keys.answers);
    return saved ? JSON.parse(saved) : {};
  });
  // Auto-submit (timer expiry / tab switch) fires from effect closures whose deps
  // don't include `answers`; reading `answers` directly there would submit a stale
  // (often empty) map and lose the student's work. A ref kept current every render
  // gives those closures the latest answers. See handleSubmitTest.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  // Guards against a double auto-submit (e.g. timer expiry racing a tab-switch).
  const submittingRef = useRef(false);
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

  // The block is server-side now (see api.ts checkBlockStatus/reportBlock), so it
  // can't be read synchronously from storage. Start unblocked and verify against
  // the server for a resumed session (effect below) — a brief flash before
  // confirmation is an acceptable trade-off for a durable, cross-device block.
  const [isBlocked, setIsBlocked] = useState(false);

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
      .catch((err) => {
        // A 403 here is the server-side retake cooldown (issue #24).
        if (err instanceof ApiError && err.status === 403) {
          setExamError(cooldownMessage(err));
        } else {
          setExamError("Could not load the exam. Please try again later.");
        }
      });
  }, []);

  // Verify a resumed session's block status against the server (the block is no
  // longer readable synchronously from storage — see isBlocked above).
  useEffect(() => {
    if (isLtiMode || !studentInfo?.email) return;
    checkBlockStatus(studentInfo.email)
      .then(({ blocked }) => setIsBlocked(blocked))
      .catch(() => {
        /* network hiccup: fail open, don't lock a resumed session on a transient error */
      });
  }, []);

  // LTI bootstrap: identity comes from the verified exam token (issue #9),
  // decoded client-side for display — no session-cookie round-trip needed.
  useEffect(() => {
    if (!isLtiMode || studentInfo) return;
    const identity = decodeExamToken();
    if (identity && identity.name) {
      handleStartExam({
        name: identity.name,
        email: identity.email,
        teacher: "Moodle LTI",
        date: new Date().toISOString().split("T")[0],
        startedAt: null,
        ltiMode: true,
      });
    } else {
      setLtiError("No se pudo validar tu sesión de Moodle. Vuelve a abrir el examen desde tu curso.");
    }
    setLtiLoading(false);
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
        // Report server-side (fire-and-forget) so the block is durable and
        // cross-device; react locally right away regardless of the network result.
        reportBlock(
          studentInfo.email.toLowerCase(),
          studentInfo.name,
          "Abrió otra pestaña o abandonó la ventana del examen"
        ).catch((err) => console.warn("⚠️ Failed to report anti-cheat block:", err));
        setIsTimerRunning(false);
        setIsBlocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [studentInfo, evaluationResult, isBlocked]);

  // Countdown — the updater stays pure (just decrements). Auto-submit at zero is
  // handled by a separate effect below; calling handleSubmitTest inside the
  // updater would make it impure and could fire the submit more than once.
  useEffect(() => {
    if (!(isTimerRunning && studentInfo && !evaluationResult && !isBlocked)) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, studentInfo, evaluationResult, isBlocked]);

  // Auto-submit when the clock reaches zero. The submit guard in handleSubmitTest
  // makes this idempotent even if a tab-switch submit races the timer.
  useEffect(() => {
    if (secondsLeft === 0 && isTimerRunning && studentInfo && !evaluationResult && !isBlocked) {
      setIsTimerRunning(false);
      handleSubmitTest();
    }
  }, [secondsLeft, isTimerRunning, studentInfo, evaluationResult, isBlocked]);

  // Resume timer if logged in mid-exam
  useEffect(() => {
    if (studentInfo && !evaluationResult && !isTimerRunning && !isBlocked && secondsLeft > 0) {
      setIsTimerRunning(true);
    }
  }, [studentInfo, evaluationResult, isBlocked, secondsLeft]);

  const handleStartExam = async (info: StudentInfo) => {
    if (!isLtiMode) {
      try {
        const { blocked } = await checkBlockStatus(info.email);
        if (blocked) {
          setIsBlocked(true);
          return;
        }
      } catch (err) {
        // Fail open on a transient network error rather than lock the student out.
        console.warn("⚠️ Failed to check anti-cheat block status:", err);
      }
    }
    setIsBlocked(false);
    submittingRef.current = false;
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

  // The actual unblock is a server-side admin action (AccessControlTab calls the
  // admin API directly). This just un-sticks the *current* browser's session when
  // it happens to be the email that was just unblocked.
  const handleEmailUnblocked = (email: string) => {
    if (studentInfo && studentInfo.email.toLowerCase() === email.trim().toLowerCase()) {
      setIsBlocked(false);
      setIsTimerRunning(true);
    }
  };

  const handleResetCooldown = (email: string) => {
    const lower = email.trim().toLowerCase();
    try {
      const attemptsMap = JSON.parse(storage.getItem(ATTEMPTS_KEY) ?? "{}");
      if (attemptsMap[lower]) {
        delete attemptsMap[lower];
        storage.setItem(ATTEMPTS_KEY, JSON.stringify(attemptsMap));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // MCQ choice and essay-topic choice are the same operation (set selectedKey).
  const updateSelectedKey = (questionId: number, key: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], selectedKey: key } }));
  };
  const updateText = (questionId: number, text: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], text } }));
  };

  const handleSubmitTest = async () => {
    if (!studentInfo || submittingRef.current) return;
    submittingRef.current = true;
    setIsGrading(true);
    setGradingProgress("Scoring Reading answers...");
    const t = setTimeout(() => setGradingProgress("Evaluating your writing..."), 2500);

    // Read the latest answers via the ref: this runs from stale effect closures
    // on auto-submit, where the `answers` binding would be out of date.
    const answerList: AnswerInput[] = Object.entries(answersRef.current).map(([id, a]) => ({
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
      if (error instanceof ApiError && error.status === 403) {
        // Server-side retake cooldown (issue #24).
        setErrorMessage(cooldownMessage(error));
        setIsTimerRunning(false);
      } else {
        setErrorMessage("There was an error grading your exam. Please click submit again.");
      }
      // Submission failed — release the guard so the student can retry.
      submittingRef.current = false;
    } finally {
      clearTimeout(t);
      setIsGrading(false);
    }
  };

  const readingQuestions = examData?.questions.filter((q) => q.skill === "reading") ?? [];
  const writingQuestions = examData?.questions.filter((q) => q.skill === "writing") ?? [];

  // ── Pick the active screen ──────────────────────────────────────────────────
  let screen: ReactNode;
  if (ltiLoading) {
    screen = (
      <StatusScreen icon={<GraduationCap size={44} className="text-slate-900 animate-pulse" />}>
        <p className="text-base font-medium">Conectando con Moodle...</p>
      </StatusScreen>
    );
  } else if (ltiError) {
    screen = (
      <StatusScreen icon={<ShieldAlert size={44} className="text-rose-500" />}>
        <p className="text-base font-semibold text-rose-600">{ltiError}</p>
      </StatusScreen>
    );
  } else if (!studentInfo) {
    screen = (
      <LoginScreen
        onStart={handleStartExam}
        currentVersion={examVersion}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />
    );
  } else if (isBlocked) {
    screen = (
      <BlockedScreen
        email={studentInfo.email}
        onExit={handleExitBlockedState}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />
    );
  } else if (isGrading) {
    screen = <GradingScreen progress={gradingProgress} />;
  } else if (evaluationResult) {
    screen = <ResultsScreen result={evaluationResult} onReset={() => setShowResetModal(true)} />;
  } else {
    screen = (
      <ExamShell
        studentName={studentInfo.name}
        secondsLeft={secondsLeft}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        examData={examData}
        examError={examError}
        readingQuestions={readingQuestions}
        writingQuestions={writingQuestions}
        answers={answers}
        updateMcq={updateSelectedKey}
        updateTopic={updateSelectedKey}
        updateText={updateText}
        onSubmitClick={() => setShowSubmitModal(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />
    );
  }

  // Overlays (modals + admin) render above whichever screen is active.
  return (
    <>
      {screen}

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
          currentStudentEmail={studentInfo?.email}
          onEmailUnblocked={handleEmailUnblocked}
          onResetCooldown={handleResetCooldown}
          currentVersion={examVersion}
        />
      )}
    </>
  );
}
