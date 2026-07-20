// Instructions + integrity agreement. Copy describes only what the exam actually
// does — Reading (MCQ) and Writing (essays graded automatically). No listening,
// speaking, TTS, or microphone features exist.
interface GuidelinesPanelProps {
  agreeTerms: boolean;
  onAgreeChange: (v: boolean) => void;
}

export default function GuidelinesPanel({ agreeTerms, onAgreeChange }: GuidelinesPanelProps) {
  return (
    <>
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
          Important Instructions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 font-sans">
          <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
            <span className="font-bold text-slate-800 block mb-1">📖 Reading</span>
            Multiple-choice questions on grammar and comprehension, graded automatically against the
            answer key.
          </div>
          <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
            <span className="font-bold text-slate-800 block mb-1">✍️ Writing</span>
            Short essay tasks with a target word count. Write directly in the editor; there is no
            audio or microphone involved.
          </div>
          <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
            <span className="font-bold text-slate-800 block mb-1">🎓 Automated Grading</span>
            Your writing is scored against CEFR criteria to place you at a proficiency level (A1–C2).
          </div>
        </div>
      </div>

      <div className="border border-indigo-100 bg-indigo-50/30 rounded-lg p-4 flex items-start gap-3">
        <input
          id="agree-checkbox"
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => onAgreeChange(e.target.checked)}
          className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
        />
        <label
          htmlFor="agree-checkbox"
          className="text-xs text-slate-600 leading-relaxed select-none cursor-pointer font-sans"
        >
          I have read the guidelines and certify that I will complete this test with academic
          integrity, individually, and without help from dictionaries, translators, or other people.
        </label>
      </div>
    </>
  );
}
