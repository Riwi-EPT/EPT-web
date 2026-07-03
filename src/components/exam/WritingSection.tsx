import { FileText, ArrowLeft, Send } from "lucide-react";
import type { WritingSectionProps } from "./types";

// Writing tasks (essays). Each task may offer topic choices (delivered as the
// question's options) and a free-text response with a word-count guide.
export default function WritingSection({
  questions,
  answers,
  updateTopic,
  updateText,
  wordCount,
  setShowSubmitModal,
  setActiveTab,
}: WritingSectionProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
          <FileText size={18} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-base leading-none">Part 2 — Writing</h2>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            Evaluated by an automated writing scorer
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-8">
        {questions.map((q, idx) => {
          const answer = answers[q.id] ?? {};
          const words = wordCount(answer.text ?? "");
          const min = q.wordMin ?? undefined;
          const max = q.wordMax ?? undefined;
          const withinRange =
            (min === undefined || words >= min) && (max === undefined || words <= max);
          const topics = q.options ?? [];

          return (
            <div key={q.id} className="space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">
                <span className="text-slate-400 mr-2 font-mono">Task {idx + 1}.</span>
                {q.prompt}
              </h3>

              {topics.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                    Choose one topic
                  </p>
                  <div className="grid gap-2">
                    {topics.map((t) => {
                      const isSelected = (answer.selectedKey ?? topics[0]?.key) === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() => updateTopic(q.id, t.key)}
                          className={`text-left text-sm px-4 py-2.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-medium"
                              : "bg-white border-slate-200 text-slate-700 hover:border-indigo-200"
                          }`}
                        >
                          {t.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <textarea
                value={answer.text ?? ""}
                onChange={(e) => updateText(q.id, e.target.value)}
                rows={10}
                placeholder="Write your response here..."
                className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
              />
              <div className="flex justify-between text-xs font-mono">
                <span className={withinRange && words > 0 ? "text-emerald-600" : "text-slate-400"}>
                  {words} words
                </span>
                {(min !== undefined || max !== undefined) && (
                  <span className="text-slate-400">
                    Target: {min ?? "?"}–{max ?? "?"} words
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 md:px-8 py-4 border-t border-slate-100 flex justify-between">
        <button
          onClick={() => setActiveTab("reading")}
          className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to Reading
        </button>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Send size={13} />
          Submit Exam
        </button>
      </div>
    </div>
  );
}
