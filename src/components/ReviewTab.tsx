import type { ResultDTO } from "@riwi-ept/shared";
import { Award, Printer, RefreshCw, BookOpen, FileText } from "lucide-react";

interface ReviewTabProps {
  result: ResultDTO;
  onReset: () => void;
}

function ScoreBar({ label, score, max, percentage, icon }: {
  label: string;
  score: number;
  max: number;
  percentage: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {icon}
          {label}
        </span>
        <span className="text-sm font-mono text-slate-500">
          {score}/{max}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
      <div className="text-right text-[11px] font-mono text-slate-400 mt-1">{percentage}%</div>
    </div>
  );
}

export default function ReviewTab({ result, onReset }: ReviewTabProps) {
  const { studentInfo, reading, writing, overall } = result;
  const issuedDate = studentInfo.date ?? new Date().toLocaleDateString();

  return (
    <div id="placement-review-wrapper" className="space-y-6">
      <div id="efset-certificate-sheet" className="space-y-6">
        {/* Certificate header — visible only when printing */}
        <div className="hidden print:block text-center pb-4 mb-2 border-b-2 border-slate-900">
          <h1 className="text-2xl font-black tracking-tight">English Placement Certificate</h1>
          <p className="text-[11px] uppercase tracking-widest mt-1">RIWI · English Placement Test</p>
          <p className="text-sm mt-3 font-semibold">{studentInfo.name}</p>
          <p className="text-xs">
            {studentInfo.email} · Issued {issuedDate}
          </p>
        </div>

        {/* Overall card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-indigo-600 rounded-full opacity-20 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-indigo-300">
              {studentInfo.name} · {studentInfo.email}
            </p>
            <h2 className="text-3xl font-black mt-2">Overall CEFR: {overall.cefr}</h2>
            <p className="text-sm text-slate-300 mt-1">
              RIWI band {overall.band} · {overall.score}/{overall.max} ({overall.percentage}%)
            </p>
          </div>
          <div className="w-20 h-20 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
            <Award size={36} className="text-indigo-200" />
          </div>
        </div>
      </div>

      {/* Section scores */}
      <div className="grid md:grid-cols-2 gap-4">
        <ScoreBar
          label="Reading"
          score={reading.score}
          max={reading.max}
          percentage={reading.percentage}
          icon={<BookOpen size={16} className="text-indigo-600" />}
        />
        <ScoreBar
          label="Writing"
          score={writing.score}
          max={writing.max}
          percentage={writing.max ? Math.round((writing.score / writing.max) * 100) : 0}
          icon={<FileText size={16} className="text-indigo-600" />}
        />
      </div>

      {/* Writing feedback */}
      {writing.tasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Writing feedback</h3>
          {writing.tasks.map((t) => (
            <div key={t.questionId} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Task {t.number}</span>
                <span className="text-xs font-mono text-slate-500">
                  {t.score}/{t.max} · CEFR {t.cefr}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{t.feedback}</p>
              {t.corrections && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3 leading-relaxed">
                  <strong className="text-slate-600">Corrections: </strong>
                  {t.corrections}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4">
          {result.summary}
        </p>

        {/* Signature footer — visible only when printing */}
        <div className="hidden print:flex justify-between pt-12 mt-6 text-xs text-slate-700">
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
