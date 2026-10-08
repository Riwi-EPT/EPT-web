import { Headphones } from "lucide-react";
import type { QuestionDTO } from "@riwi-ept/shared";
import type { ListeningSectionProps } from "./types";
import QuestionNavigator from "./QuestionNavigator";
import AudioPlayer from "./AudioPlayer";
import { McqChoices } from "./ReadingSection";

// Listening is multiple-choice about the version's one fixed track. Every question
// shares it, so the play count carries across questions.
export default function ListeningSection({
  questions,
  answers,
  updateMcq,
  currentIndex,
  questionSecondsLeft,
  onNext,
  onFinish,
  finishLabel,
  audio,
  audioPlays,
  onPlayRegistered,
}: ListeningSectionProps) {
  const answeredCount = questions.filter((q) => answers[q.id]?.selectedKey).length;
  const track = audio[0];

  const renderQuestion = (q: QuestionDTO, { isEditable }: { isEditable: boolean }) => {
    return (
      <div className="border border-slate-200 rounded-xl p-5 bg-white">
        {track && (
          <AudioPlayer
            key={track.id}
            audio={track}
            playsUsed={audioPlays[track.id] ?? 0}
            onPlayRegistered={onPlayRegistered}
          />
        )}
        <p className="font-medium text-slate-800 text-sm mb-3">
          <span className="text-slate-400 mr-2 font-mono">{q.number}.</span>
          {q.prompt}
        </p>
        <McqChoices question={q} selected={answers[q.id]?.selectedKey} isEditable={isEditable} updateMcq={updateMcq} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
            <Headphones size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base leading-none">Listening</h2>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Multiple choice · use headphones · limited plays
            </span>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {answeredCount}/{questions.length} answered
        </span>
      </div>

      <QuestionNavigator
        questions={questions}
        currentIndex={currentIndex}
        questionSecondsLeft={questionSecondsLeft}
        onNext={onNext}
        onFinish={onFinish}
        finishLabel={finishLabel}
        renderQuestion={renderQuestion}
      />
    </div>
  );
}
