import type { ReactNode } from "react";
import {
  AlarmClock, Send, ChevronRight, GraduationCap, Settings, BookOpen, FileText, Headphones,
} from "lucide-react";
import type { ExamDTO, QuestionDTO } from "@riwi-ept/shared";
import type { ExamTab, AnswersMap } from "./types";
import ReadingSection from "./ReadingSection";
import ListeningSection from "./ListeningSection";
import WritingSection from "./WritingSection";
import { formatTimer, wordCount } from "../../lib/format";
import { SECTION_LABEL, nextSection } from "../../lib/sections";

const SECTION_ICON: Record<ExamTab, ReactNode> = {
  reading: <BookOpen size={14} />,
  listening: <Headphones size={14} />,
  writing: <FileText size={14} />,
};

export interface ExamShellProps {
  studentName: string;
  secondsLeft: number;
  activeTab: ExamTab;
  setActiveTab: (tab: ExamTab) => void;
  examData: ExamDTO | null;
  examError: string | null;
  /** The sections this version has, in the order they are taken. */
  sections: ExamTab[];
  questionsBySkill: Record<ExamTab, QuestionDTO[]>;
  answers: AnswersMap;
  updateMcq: (questionId: number, key: string) => void;
  updateTopic: (questionId: number, key: string) => void;
  updateText: (questionId: number, text: string) => void;
  onSubmitClick: () => void;
  onOpenAdmin: () => void;
  /** Furthest-reached (server-validated) question index within each skill. */
  sectionIndex: Record<ExamTab, number>;
  /** Server-mirrored countdown for the currently-active skill's live question. */
  questionSecondsLeft: number | null;
  onNext: (tab: ExamTab) => void;
  /** Listening plays already spent per audio track in this attempt. */
  audioPlays: Record<number, number>;
  onPlayRegistered: (audioId: number, playsUsed: number) => void;
}

export default function ExamShell({
  studentName,
  secondsLeft,
  activeTab,
  setActiveTab,
  examData,
  examError,
  sections,
  questionsBySkill,
  answers,
  updateMcq,
  updateTopic,
  updateText,
  onSubmitClick,
  onOpenAdmin,
  sectionIndex,
  questionSecondsLeft,
  onNext,
  audioPlays,
  onPlayRegistered,
}: ExamShellProps) {
  const answeredIn = (tab: ExamTab) =>
    questionsBySkill[tab].filter((q) =>
      tab === "writing" ? (answers[q.id]?.text ?? "").trim() : answers[q.id]?.selectedKey
    ).length;

  // Finishing an MCQ section moves to the next one; the last section submits.
  const finishProps = (tab: ExamTab) => {
    const next = nextSection(sections, tab);
    return next
      ? { onFinish: () => setActiveTab(next), finishLabel: `Continue to ${SECTION_LABEL[next]}` }
      : { onFinish: onSubmitClick, finishLabel: "Submit Exam" };
  };

  const liveSecondsLeft = (tab: ExamTab) => (activeTab === tab ? questionSecondsLeft : null);

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
                ACTIVE · <span className="text-slate-800 font-extrabold">{studentName}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-6">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 font-mono font-bold text-xs">
              <AlarmClock size={15} className="animate-pulse" />
              <span>{formatTimer(secondsLeft)} remaining</span>
            </div>
            <button
              onClick={onSubmitClick}
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
          {sections.map((id, i) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full text-left p-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                activeTab === id
                  ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${
                    activeTab === id ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {i + 1}
                </span>
                {SECTION_ICON[id]}
                Part {i + 1} — {SECTION_LABEL[id]}
              </span>
              <ChevronRight size={14} className={activeTab === id ? "text-indigo-200" : "text-slate-400"} />
            </button>
          ))}

          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mt-6 text-xs text-slate-500 leading-relaxed space-y-2">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Progreso
            </div>
            {sections.map((id) => (
              <div key={id}>
                <strong>{SECTION_LABEL[id]}:</strong> {answeredIn(id)}/{questionsBySkill[id].length}
              </div>
            ))}
          </div>

          <button
            onClick={onOpenAdmin}
            className="w-full mt-4 flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
          >
            <Settings size={13} />
            Panel de Docente (Admin)
          </button>
        </nav>

        <main className="md:col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[32rem]">
          {examError && <div className="p-8 text-sm text-rose-600">{examError}</div>}
          {!examData && !examError && <div className="p-8 text-sm text-slate-500">Loading exam…</div>}
          {examData && activeTab === "reading" && (
            <ReadingSection
              questions={questionsBySkill.reading}
              answers={answers}
              updateMcq={updateMcq}
              currentIndex={sectionIndex.reading}
              questionSecondsLeft={liveSecondsLeft("reading")}
              onNext={() => onNext("reading")}
              {...finishProps("reading")}
            />
          )}
          {examData && activeTab === "listening" && (
            <ListeningSection
              questions={questionsBySkill.listening}
              answers={answers}
              updateMcq={updateMcq}
              currentIndex={sectionIndex.listening}
              questionSecondsLeft={liveSecondsLeft("listening")}
              onNext={() => onNext("listening")}
              {...finishProps("listening")}
              audio={examData.audio ?? []}
              audioPlays={audioPlays}
              onPlayRegistered={onPlayRegistered}
            />
          )}
          {examData && activeTab === "writing" && (
            <WritingSection
              questions={questionsBySkill.writing}
              answers={answers}
              updateTopic={updateTopic}
              updateText={updateText}
              wordCount={wordCount}
              setShowSubmitModal={onSubmitClick}
              currentIndex={sectionIndex.writing}
              questionSecondsLeft={liveSecondsLeft("writing")}
              onNext={() => onNext("writing")}
            />
          )}
        </main>
      </div>
    </div>
  );
}
