import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { QuestionDTO } from "@riwi-ept/shared";
import { formatTimer } from "../../lib/format";

export interface QuestionNavigatorProps {
  questions: QuestionDTO[];
  /**
   * The furthest-reached question index for this skill — server-validated via
   * POST /api/exam/question/start's ordering check. The only index that is
   * live/editable; anything earlier is a past question, shown read-only.
   */
  currentIndex: number;
  /** Server-mirrored countdown for the live (currentIndex) question. Null
   *  when it's untimed, or the live question hasn't started yet. */
  questionSecondsLeft: number | null;
  /** Advance past the live question — autosaves it, then starts the next one
   *  server-side. Not called when just catching back up to an already-live
   *  question after Back (that's pure client state, handled internally). */
  onNext: () => void;
  /** Reached when Next is pressed while already on the last question. */
  onFinish: () => void;
  finishLabel: string;
  renderQuestion: (question: QuestionDTO, opts: { isEditable: boolean }) => ReactNode;
}

/**
 * One-question-at-a-time navigation shell shared by ReadingSection and
 * WritingSection. Back only ever moves the local `viewIndex` — it never calls
 * the server — which is what guarantees going back can't re-arm a question's
 * clock. Only `currentIndex` (server-authoritative) can move forward for real.
 */
export default function QuestionNavigator({
  questions,
  currentIndex,
  questionSecondsLeft,
  onNext,
  onFinish,
  finishLabel,
  renderQuestion,
}: QuestionNavigatorProps) {
  const [viewIndex, setViewIndex] = useState(currentIndex);

  // Follow the live question as it genuinely advances. Back never changes
  // currentIndex, so this effect never undoes a deliberate Back.
  useEffect(() => {
    setViewIndex(currentIndex);
  }, [currentIndex]);

  const question = questions[viewIndex];
  const isLive = viewIndex === currentIndex;
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleBack = () => setViewIndex((i) => Math.max(0, i - 1));
  const handleNext = () => {
    if (!isLive) {
      // Catching back up toward the live question — client-side only.
      setViewIndex((i) => Math.min(currentIndex, i + 1));
      return;
    }
    if (isLastQuestion) onFinish();
    else onNext();
  };

  if (!question) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 md:px-8 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Question {viewIndex + 1} of {questions.length}
        </span>
        {isLive && questionSecondsLeft !== null && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-mono font-bold text-xs">
            {formatTimer(questionSecondsLeft)} for this question
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
        {renderQuestion(question, { isEditable: isLive })}
      </div>

      <div className="px-6 md:px-8 py-4 border-t border-slate-100 flex justify-between">
        <button
          onClick={handleBack}
          disabled={viewIndex === 0}
          className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          {isLive && isLastQuestion ? finishLabel : "Next"}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
