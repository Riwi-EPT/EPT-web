import type { ResultDTO } from "@riwi-ept/shared";
import { Award, Printer, RefreshCw, BookOpen, FileText, Headphones, Info } from "lucide-react";

interface ReviewTabProps {
  result: ResultDTO;
  onReset: () => void;
}

/** Percentage of a section, tolerating results stored before `percentage` was always set. */
export function sectionPercentage(s: { score: number; max: number; percentage?: number }): number {
  if (typeof s.percentage === "number") return s.percentage;
  return s.max ? Math.round((s.score / s.max) * 100) : 0;
}

export function ScoreBar({ label, score, max, percentage, icon, cefr, band }: {
  label: string;
  score: number;
  max: number;
  percentage: number;
  icon: React.ReactNode;
  /** Per-skill level; omitted/null (scores-only version or legacy result) hides it. */
  cefr?: string | null;
  band?: number | null;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 print:p-3">
      <div className="flex items-center justify-between mb-2 print:mb-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {icon}
          {label}
        </span>
        <span className="text-sm font-mono text-slate-500">
          {score}/{max}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden print:hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
      <div className="flex justify-between items-baseline mt-1 print:mt-0">
        <span className="text-xs font-bold text-slate-700">
          {cefr ? `CEFR ${cefr}${band != null ? ` · band ${band}` : ""}` : ""}
        </span>
        <span className="text-[11px] font-mono text-slate-400">{percentage}%</span>
      </div>
    </div>
  );
}

export default function ReviewTab({ result, onReset }: ReviewTabProps) {
  const { studentInfo, reading, listening, writing, overall } = result;
  // Results stored before the scoring redesign lack `provisional` and per-section levels.
  const provisional = result.provisional === true;
  const issuesLevel = overall.cefr != null;
  const issuedDate = studentInfo.date ?? new Date().toLocaleDateString();

  return (
    <div id="placement-review-wrapper" className="space-y-6 print:space-y-2">
      <div id="efset-certificate-sheet" className="space-y-6 print:space-y-2">
        {/* Certificate header — visible only when printing */}
        <div className="hidden print:block text-center pb-2 mb-1 border-b-2 border-slate-900">
          <h1 className="text-xl font-black tracking-tight">English Placement Certificate</h1>
          <p className="text-[10px] uppercase tracking-widest mt-1">RIWI · English Placement Test</p>
          <p className="text-sm mt-2 font-semibold">{studentInfo.name}</p>
          <p className="text-xs">
            {studentInfo.email} · Issued {issuedDate}
          </p>
        </div>

        {/* Overall card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 print:p-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-indigo-600 rounded-full opacity-20 blur-3xl print:hidden" />
        <div className="flex flex-col md:flex-row print:flex-row md:items-center print:items-center justify-between gap-6 print:gap-3 relative">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-indigo-300">
              {studentInfo.name} · {studentInfo.email}
            </p>
            {issuesLevel ? (
              <>
                <h2 className="text-3xl print:text-2xl font-black mt-2 print:mt-1">Overall CEFR: {overall.cefr}</h2>
                <p className="text-sm text-slate-300 mt-1">
                  {overall.band != null && <>RIWI band {overall.band} · </>}
                  {overall.score}/{overall.max} ({overall.percentage}%)
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl print:text-2xl font-black mt-2 print:mt-1">
                  Score: {overall.score}/{overall.max} ({overall.percentage}%)
                </h2>
                <p className="text-sm text-slate-300 mt-1">This test version does not issue a CEFR level.</p>
              </>
            )}
          </div>
          <div className="w-20 h-20 print:w-14 print:h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0">
            <Award size={36} className="text-indigo-200 print:size-6" />
          </div>
        </div>
      </div>

      {provisional && (
        <div
          role="status"
          className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 print:p-2"
        >
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>Provisional result.</strong> Your writing was scored automatically and may be reviewed;
            your level can change after review.
          </span>
        </div>
      )}

      {/* Section scores — column count forced even at print width (paper width falls below `md`) */}
      <div
        className={`grid gap-4 print:gap-2 ${
          listening ? "md:grid-cols-3 print:grid-cols-3" : "md:grid-cols-2 print:grid-cols-2"
        }`}
      >
        <ScoreBar
          label="Reading"
          score={reading.score}
          max={reading.max}
          percentage={sectionPercentage(reading)}
          cefr={reading.cefr}
          band={reading.band}
          icon={<BookOpen size={16} className="text-indigo-600" />}
        />
        {listening && (
          <ScoreBar
            label="Listening"
            score={listening.score}
            max={listening.max}
            percentage={sectionPercentage(listening)}
            cefr={listening.cefr}
            band={listening.band}
            icon={<Headphones size={16} className="text-indigo-600" />}
          />
        )}
        <ScoreBar
          label="Writing"
          score={writing.score}
          max={writing.max}
          percentage={sectionPercentage(writing)}
          cefr={writing.cefr}
          band={writing.band}
          icon={<FileText size={16} className="text-indigo-600" />}
        />
      </div>

      {/* Writing task scores — no AI feedback/corrections text is shown to students */}
      {writing.tasks.length > 0 && (
        <div className="space-y-2 print:space-y-1">
          <h3 className="text-sm font-bold text-slate-700">Writing tasks</h3>
          {writing.tasks.map((t) => (
            <div
              key={t.questionId}
              className="bg-white border border-slate-200 rounded-xl p-4 print:p-2 flex items-center justify-between"
            >
              <span className="text-sm font-semibold text-slate-800">Task {t.number}</span>
              <span className="text-xs font-mono text-slate-500">
                {t.score}/{t.max}
                {issuesLevel && t.cefr ? ` · CEFR ${t.cefr}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4 print:p-2">
          {result.summary}
        </p>

        {/* Signature footer — visible only when printing */}
        <div className="hidden print:flex justify-between pt-6 mt-2 text-xs text-slate-700">
          <div className="border-t border-slate-900 pt-1 w-52 text-center">Authorized Examiner</div>
          <div className="border-t border-slate-900 pt-1 w-52 text-center">Date: {issuedDate}</div>
        </div>
      </div>

      <div className="flex justify-end gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Printer size={14} />
          Print
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}
