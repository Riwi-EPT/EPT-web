import { useState, useEffect, useRef, type ReactNode } from "react";
import { GraduationCap, ShieldAlert } from "lucide-react";
import type { StudentInfo } from "./types";
import type { ExamDTO, ResultDTO, AnswerInput } from "@riwi-ept/shared";
import type { ExamTab, AnswersMap } from "./components/exam/types";
import {
  fetchExam, submitExam, decodeExamToken, checkBlockStatus, reportBlock, ApiError,
  startAttempt, saveAnswers, getAttemptToken, clearAttemptToken,
  startQuestion, fetchQuestionProgress,
} from "./api";
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
  // Same reason as answersRef: the autosave effect must not list `secondsLeft` in
  // its deps (that would reset the debounce every tick), but still needs the
  // current value to stop saving once time is up.
  const secondsLeftRef = useRef<number | null>(null);
  const [examData, setExamData] = useState<ExamDTO | null>(null);
  const [examError, setExamError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ExamTab>("reading");
  // null = the server hasn't told us yet. Deliberately NOT seeded from storage:
  // the remaining time is the server's to report (POST /api/exam/start), and a
  // local seed could only disagree with it. null also keeps the auto-submit-at-zero
  // effect from firing before we know the real value.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  secondsLeftRef.current = secondsLeft;
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // ── Per-question pacing (one-at-a-time nav + optional per-question timer) ────
  // Same anti-cheat doctrine as the whole-exam clock above: the server computes
  // and enforces every per-question deadline (see POST /api/exam/question/start);
  // these are only ever a mirror of it. `readingIndex`/`writingIndex` are the
  // furthest-reached (server-validated) question per skill — Back navigation
  // inside QuestionNavigator moves a separate, purely local view index and never
  // touches these, which is what keeps Back from ever re-arming a clock.
  const [readingIndex, setReadingIndex] = useState(0);
  const [writingIndex, setWritingIndex] = useState(0);
  const [readingExpiresAt, setReadingExpiresAt] = useState<string | null>(null);
  const [writingExpiresAt, setWritingExpiresAt] = useState<string | null>(null);
  // Ticks once a second while the exam is active, purely to re-derive
  // `questionSecondsLeft` below from a server-stamped deadline — never itself
  // trusted as the deadline.
  const [questionNow, setQuestionNow] = useState(() => Date.now());
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
  // (The countdown is deliberately no longer mirrored to storage — see the note
  // on `keys` in lib/examSession.ts. It is re-derived from the server on resume.)

  // Resume the server's clock for a session restored from storage (page reload,
  // reopened tab). This is what makes a refresh continue the exam rather than
  // restart it: /api/exam/start returns the *existing* attempt when one is live.
  useEffect(() => {
    if (!studentInfo || evaluationResult || isBlocked) return;
    let cancelled = false;
    startAttempt(examVersion, studentInfo)
      .then((started) => {
        if (cancelled) return;
        setSecondsLeft(started.remainingSeconds);
        setIsTimerRunning(started.remainingSeconds > 0);
      })
      .catch((err) => {
        if (cancelled) return;
        handleStartFailure(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setSecondsLeft((prev) => (prev === null ? null : prev <= 1 ? 0 : prev - 1));
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

  // Resume timer if logged in mid-exam (only once the server has reported a value).
  useEffect(() => {
    if (
      studentInfo && !evaluationResult && !isTimerRunning && !isBlocked &&
      secondsLeft !== null && secondsLeft > 0
    ) {
      setIsTimerRunning(true);
    }
  }, [studentInfo, evaluationResult, isBlocked, secondsLeft]);

  // On resume (reload, reopened tab), find the furthest-reached question per
  // skill from the server's own record — never re-derived from anything local
  // — so a reload picks up exactly where it left off without re-arming any
  // question's clock. Runs once per (studentInfo, examData) pair.
  useEffect(() => {
    if (!studentInfo || !examData || evaluationResult || isBlocked) return;
    if (!getAttemptToken()) return;
    let cancelled = false;

    const readingQs = examData.questions.filter((q) => q.skill === "reading");
    const writingQs = examData.questions.filter((q) => q.skill === "writing");

    fetchQuestionProgress()
      .then(({ progress }) => {
        if (cancelled || !progress.length) return;
        const byId = new Map(progress.map((p) => [p.questionId, p]));

        const seed = (
          qs: typeof readingQs,
          setIndex: (n: number) => void,
          setExpiresAt: (v: string | null) => void
        ) => {
          if (!qs.length) return;
          let furthest = 0;
          for (let i = 0; i < qs.length; i++) {
            if (byId.has(qs[i].id)) furthest = i;
            else break;
          }
          setIndex(furthest);
          setExpiresAt(byId.get(qs[furthest].id)?.expiresAt ?? null);
        };

        seed(readingQs, setReadingIndex, setReadingExpiresAt);
        seed(writingQs, setWritingIndex, setWritingExpiresAt);
      })
      .catch(() => {
        // Fail open: worst case the navigator re-starts from question 1, which
        // is idempotent server-side and just costs a redundant (harmless) call.
      });
    return () => {
      cancelled = true;
    };
  }, [studentInfo, examData]);

  // "Reach" the current question of whichever skill is active — starts its own
  // clock (if timed) exactly once, server-side. Re-fires only when the active
  // tab or that skill's current index actually changes (a real advance or tab
  // switch), never on every render, so it can't re-arm anything.
  useEffect(() => {
    if (!studentInfo || !examData || evaluationResult || isBlocked) return;
    const questions = examData.questions.filter((q) => q.skill === activeTab);
    const index = activeTab === "reading" ? readingIndex : writingIndex;
    const q = questions[index];
    if (!q) return;
    const setExpiresAt = activeTab === "reading" ? setReadingExpiresAt : setWritingExpiresAt;
    startQuestion(q.id)
      .then((res) => setExpiresAt(res.questionExpiresAt))
      .catch((err) => console.warn("⚠️ Could not start this question:", err));
  }, [activeTab, readingIndex, writingIndex, studentInfo, examData, evaluationResult, isBlocked]);

  // Tick once a second so questionSecondsLeft (derived below) stays live.
  useEffect(() => {
    if (!(isTimerRunning && studentInfo && !evaluationResult && !isBlocked)) return;
    const interval = setInterval(() => setQuestionNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, studentInfo, evaluationResult, isBlocked]);

  const activeQuestionExpiresAt = activeTab === "reading" ? readingExpiresAt : writingExpiresAt;
  const questionSecondsLeft = activeQuestionExpiresAt
    ? Math.max(0, Math.ceil((Date.parse(activeQuestionExpiresAt) - questionNow) / 1000))
    : null;

  /**
   * Advance past the live question of `tab`: flush-save whatever's filled in,
   * then either move to the next question in that skill (which the "reach the
   * current question" effect above will start server-side) or, past the last
   * question, hand off to the same Finish action the manual Next button uses
   * (tab switch for Reading, the submit-confirm modal for Writing).
   *
   * Reads answers via the ref, not the `answers` binding: this can run from the
   * auto-advance effect's closure, whose deps deliberately exclude `answers` —
   * same reasoning as handleSubmitTest below.
   */
  const goToNextQuestion = (tab: ExamTab) => {
    if (!examData) return;
    const questions = examData.questions.filter((q) => q.skill === tab);
    const index = tab === "reading" ? readingIndex : writingIndex;
    const setIndex = tab === "reading" ? setReadingIndex : setWritingIndex;
    const setExpiresAt = tab === "reading" ? setReadingExpiresAt : setWritingExpiresAt;

    const list = toAnswerList(answersRef.current);
    if (list.length) {
      saveAnswers(list).catch((err) => console.warn("⚠️ Flush-save on advance failed:", err));
    }

    const next = questions[index + 1];
    if (!next) {
      if (tab === "reading") setActiveTab("writing");
      else setShowSubmitModal(true);
      return;
    }
    setIndex(index + 1);
    // Cleared immediately (rather than left at the just-expired value) so
    // questionSecondsLeft doesn't briefly still read 0 for the NEW question and
    // cascade into advancing past it too before its own start call resolves.
    setExpiresAt(null);
  };

  // Auto-advance when the ACTIVE question's own clock (not the whole-exam one)
  // reaches zero: autosave whatever is filled in, then move to the next
  // question — the same "autosave then act" shape as the whole-exam
  // auto-submit-at-zero effect above, just scoped to one question.
  useEffect(() => {
    if (!studentInfo || evaluationResult || isBlocked) return;
    if (questionSecondsLeft !== 0) return;
    goToNextQuestion(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionSecondsLeft, activeTab, readingIndex, writingIndex, studentInfo, evaluationResult, isBlocked]);

  /** Turn a failed /api/exam/start into something the student can act on. */
  const handleStartFailure = (err: unknown) => {
    if (err instanceof ApiError && err.status === 403) {
      const reason = (err.body as { reason?: string } | null)?.reason;
      if (reason === "attempt_expired") {
        // The server finalized an attempt whose deadline passed while they were
        // away — their in-time work was graded. Clear local state so they aren't
        // left sitting in a dead exam.
        clearExamState();
        setErrorMessage(
          "Your exam time ran out, so your attempt was submitted automatically. " +
            "Only the answers saved before the deadline were graded."
        );
        return;
      }
      // Otherwise it's the retake cooldown.
      setErrorMessage(cooldownMessage(err));
      return;
    }
    setErrorMessage("Could not start the exam. Please try again.");
  };

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

    // Start the server clock BEFORE entering the exam. /api/exam/start fails
    // closed, and honoring that is the point: if we cannot establish an
    // enforceable deadline, the student stays on the login screen with a retry
    // rather than sitting in an untimed exam.
    let started;
    try {
      started = await startAttempt(examVersion, info);
    } catch (err) {
      handleStartFailure(err);
      return;
    }

    // startedAt is the server's to record now (see StudentInfo.startedAt).
    setStudentInfo({ ...info, startedAt: null });
    setAnswers({});
    setSecondsLeft(started.remainingSeconds);
    setIsTimerRunning(started.remainingSeconds > 0);
    setActiveTab("reading");
    setReadingIndex(0);
    setWritingIndex(0);
    setReadingExpiresAt(null);
    setWritingExpiresAt(null);
  };

  const clearExamState = () => {
    setStudentInfo(null);
    setAnswers({});
    setEvaluationResult(null);
    setSecondsLeft(null);
    setIsTimerRunning(false);
    setReadingIndex(0);
    setWritingIndex(0);
    setReadingExpiresAt(null);
    setWritingExpiresAt(null);
    clearAttemptToken();
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
    if (secondsLeft !== null && secondsLeft <= 0) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], selectedKey: key } }));
  };
  const updateText = (questionId: number, text: string) => {
    if (secondsLeft !== null && secondsLeft <= 0) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], text } }));
  };

  /** The answers map flattened for the wire. Shared by autosave and submit. */
  const toAnswerList = (map: AnswersMap): AnswerInput[] =>
    Object.entries(map).map(([id, a]) => ({
      questionId: Number(id),
      selectedKey: a.selectedKey,
      text: a.text,
    }));

  // ── Autosave ────────────────────────────────────────────────────────────────
  // Debounced so typing an essay doesn't produce a request per keystroke. Each
  // save is stamped server-side, which is what lets the server grade only the work
  // that existed before the deadline. Failures are non-fatal: the answers stay in
  // local storage and submit's in-time body fallback covers a save that never
  // landed — the one place this design deliberately fails open.
  useEffect(() => {
    if (!studentInfo || evaluationResult || isBlocked) return;
    if (!getAttemptToken()) return;
    const left = secondsLeftRef.current;
    if (left === null || left <= 0) return;

    const list = toAnswerList(answers);
    if (!list.length) return;

    const t = setTimeout(() => {
      saveAnswers(list).catch((err) => {
        if (err instanceof ApiError && err.status === 409) {
          // The server says time is up. Trust it over our own countdown and let
          // the auto-submit effect finalize (isTimerRunning stays true so it fires).
          setSecondsLeft(0);
          return;
        }
        console.warn("⚠️ Autosave failed; keeping local copy:", err);
      });
    }, 2500);
    return () => clearTimeout(t);
    // NOTE: `secondsLeft` is read through a ref above and deliberately kept OUT of
    // these deps. Including it would re-run this effect every tick, clearing the
    // debounce timeout before it could ever fire — autosave would silently never run.
  }, [answers, studentInfo, evaluationResult, isBlocked]);

  const handleSubmitTest = async () => {
    if (!studentInfo || submittingRef.current) return;
    submittingRef.current = true;
    setIsGrading(true);
    setGradingProgress("Scoring Reading answers...");
    const t = setTimeout(() => setGradingProgress("Evaluating your writing..."), 2500);

    // Read the latest answers via the ref: this runs from stale effect closures
    // on auto-submit, where the `answers` binding would be out of date.
    const answerList: AnswerInput[] = toAnswerList(answersRef.current);

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
        durationSeconds={examData?.durationSeconds}
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
        // Before the server reports, show the version's nominal length rather than
        // a 0 that would read as "time's up".
        secondsLeft={secondsLeft ?? examData?.durationSeconds ?? EXAM_DURATION_SECONDS}
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
        readingIndex={readingIndex}
        writingIndex={writingIndex}
        questionSecondsLeft={questionSecondsLeft}
        onNextReading={() => goToNextQuestion("reading")}
        onNextWriting={() => goToNextQuestion("writing")}
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
