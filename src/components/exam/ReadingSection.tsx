import { BookOpen, CheckCircle, ArrowRight } from "lucide-react";
import type { ReadingSectionProps } from "./types";

// Reading is multiple-choice only. Questions may optionally carry a passage,
// which is shown above the question.
export default function ReadingSection({
  questions,
  answers,
  updateMcq,
  setActiveTab,
}: ReadingSectionProps) {
  const answeredCount = questions.filter((q) => answers[q.id]?.selectedKey).length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
            <BookOpen size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base leading-none">Part 1 — Reading</h2>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Multiple choice · grammar &amp; comprehension
            </span>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {answeredCount}/{questions.length} answered
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6">
        {questions.map((q) => {
          const selected = answers[q.id]?.selectedKey;
          return (
            <div key={q.id} className="border border-slate-200 rounded-xl p-5 bg-white">
              {q.passageText && (
                <div className="mb-4 p-4 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 leading-relaxed whitespace-pre-line select-none">
                  {q.passageText}
                </div>
              )}
              <p className="font-medium text-slate-800 text-sm mb-3">
                <span className="text-slate-400 mr-2 font-mono">{q.number}.</span>
                {q.prompt}
              </p>
              <div className="grid gap-2">
                {(q.options ?? []).map((opt) => {
                  const isSelected = selected === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => updateMcq(q.id, opt.key)}
                      className={`text-left text-sm px-4 py-2.5 rounded-lg border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                          : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold uppercase ${
                          isSelected ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {opt.key}
                      </span>
                      {opt.text}
                      {isSelected && <CheckCircle size={15} className="ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 md:px-8 py-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => setActiveTab("writing")}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          Continue to Writing
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
