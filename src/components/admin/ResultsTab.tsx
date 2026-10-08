import { useState, useEffect, useCallback } from "react";
import type {
  AdminAttemptDetailDTO,
  AdminResultRowDTO,
  AdminResultsPageDTO,
  AdminSectionScoreDTO,
} from "@riwi-ept/shared";
import { BookOpen, ChevronLeft, ChevronRight, FileText, Headphones, History, Search, X } from "lucide-react";
import { listResults, getResultHistory, getResultDetail, type ResultFilters } from "../../adminApi";
import { ScoreBar } from "../ReviewTab";

const PAGE_SIZE = 25;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function sectionCell(s: AdminSectionScoreDTO | null): string {
  return s ? `${s.percentage}%` : "—";
}

// Admin results: every submitted attempt, filterable, with per-person history and
// the full (unsanitized) result, writing feedback included.
export default function ResultsTab({ setError }: { setError: (msg: string | null) => void }) {
  const [draft, setDraft] = useState<ResultFilters>({});
  const [filters, setFilters] = useState<ResultFilters>({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminResultsPageDTO | null>(null);
  const [history, setHistory] = useState<{ identity: string; attempts: AdminResultRowDTO[] } | null>(null);
  const [detail, setDetail] = useState<AdminAttemptDetailDTO | null>(null);

  const load = useCallback(async () => {
    setData(await listResults({ ...filters, page, pageSize: PAGE_SIZE }));
  }, [filters, page]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [load, setError]);

  const applyFilters = () => {
    setPage(1);
    setFilters({ ...draft });
  };

  const openHistory = async (row: AdminResultRowDTO) => {
    try {
      setHistory(await getResultHistory(row.identity));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the history.");
    }
  };

  const openDetail = async (attemptId: number) => {
    try {
      setDetail(await getResultDetail(attemptId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the result.");
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Filters */}
        <form
          className="flex flex-wrap items-end gap-2 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
        >
          <label className="flex flex-col gap-1 text-[10px] text-slate-500">
            Search
            <input
              aria-label="Search by name or email"
              placeholder="Name or email"
              value={draft.q ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              className="form-input w-48"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-500">
            Version
            <input
              aria-label="Version code"
              placeholder="A"
              value={draft.version ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))}
              className="form-input w-16"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-500">
            From
            <input
              type="date"
              aria-label="From date"
              value={draft.from ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              className="form-input"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-500">
            To
            <input
              type="date"
              aria-label="To date"
              value={draft.to ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              className="form-input"
            />
          </label>
          <button
            type="submit"
            className="flex items-center gap-1 font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <Search size={12} /> Filter
          </button>
        </form>

        {/* Results table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-400">
              <tr>
                <th className="text-left px-3 py-2">Candidate</th>
                <th className="text-left px-3 py-2">Version</th>
                <th className="text-left px-3 py-2">Submitted</th>
                <th className="text-right px-3 py-2">Reading</th>
                <th className="text-right px-3 py-2">Listening</th>
                <th className="text-right px-3 py-2">Writing</th>
                <th className="text-right px-3 py-2">Overall</th>
                <th className="text-left px-3 py-2">CEFR</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => (
                <tr
                  key={r.attemptId}
                  onClick={() => openDetail(r.attemptId)}
                  className="border-t border-slate-100 hover:bg-indigo-50/50 cursor-pointer"
                >
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{r.name}</div>
                    <div className="text-[10px] text-slate-400">{r.email}</div>
                  </td>
                  <td className="px-3 py-2">{r.versionCode}</td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(r.submittedAt)}</td>
                  <td className="px-3 py-2 text-right font-mono">{sectionCell(r.reading)}</td>
                  <td className="px-3 py-2 text-right font-mono">{sectionCell(r.listening)}</td>
                  <td className="px-3 py-2 text-right font-mono">{sectionCell(r.writing)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {r.overallPercentage != null ? `${r.overallPercentage}%` : "—"}
                  </td>
                  <td className="px-3 py-2 font-bold">
                    {r.cefr ?? "—"}
                    {r.band != null && <span className="font-normal text-slate-400"> · {r.band}</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.attemptCount > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openHistory(r);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold cursor-pointer"
                      >
                        <History size={10} /> {r.attemptCount} intentos
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.rows.length === 0 && (
            <p className="text-xs text-slate-400 py-8 text-center">No results yet.</p>
          )}
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
            <span>
              {data.total} result{data.total === 1 ? "" : "s"} · page {data.page} of {totalPages}
            </span>
            <button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={12} />
            </button>
            <button
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* History drawer */}
      {history && (
        <aside
          aria-label="Attempt history"
          className="w-80 border-l border-slate-100 p-4 overflow-y-auto space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">
              History · {history.attempts.length} attempts
            </h3>
            <button aria-label="Close history" onClick={() => setHistory(null)} className="text-slate-400 cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 break-all">{history.identity}</p>
          <ol className="space-y-2">
            {history.attempts.map((a, i) => (
              <li key={a.attemptId}>
                <button
                  onClick={() => openDetail(a.attemptId)}
                  className="w-full text-left border border-slate-200 rounded-lg p-2.5 text-xs hover:bg-slate-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      #{i + 1} · {a.versionCode}
                    </span>
                    <span className="font-bold">{a.cefr ?? "—"}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatDate(a.submittedAt)} · {a.overallPercentage ?? "—"}%
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      )}

      {/* Detail panel */}
      {detail && (
        <aside
          aria-label="Attempt detail"
          className="w-96 border-l border-slate-100 p-4 overflow-y-auto space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">{detail.studentInfo.name}</h3>
            <button aria-label="Close detail" onClick={() => setDetail(null)} className="text-slate-400 cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            {detail.studentInfo.email} · {detail.versionCode} · {formatDate(detail.submittedAt)}
          </p>
          <p className="text-sm font-black text-slate-800">
            CEFR {detail.overall.cefr} · band {detail.overall.band} · {detail.overall.percentage}%
          </p>
          <ScoreBar
            label="Reading"
            score={detail.reading.score}
            max={detail.reading.max}
            percentage={detail.reading.percentage}
            icon={<BookOpen size={16} className="text-indigo-600" />}
          />
          {detail.listening && (
            <ScoreBar
              label="Listening"
              score={detail.listening.score}
              max={detail.listening.max}
              percentage={detail.listening.percentage}
              icon={<Headphones size={16} className="text-indigo-600" />}
            />
          )}
          <ScoreBar
            label="Writing"
            score={detail.writing.score}
            max={detail.writing.max}
            percentage={detail.writing.max ? Math.round((detail.writing.score / detail.writing.max) * 100) : 0}
            icon={<FileText size={16} className="text-indigo-600" />}
          />
          {detail.writing.tasks.map((t) => (
            <div key={t.questionId} className="border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Task {t.number}</span>
                <span className="font-mono text-slate-500">
                  {t.score}/{t.max} · CEFR {t.cefr}
                </span>
              </div>
              {t.feedback && <p className="text-slate-600 whitespace-pre-wrap">{t.feedback}</p>}
              {t.corrections && (
                <p className="text-slate-500 whitespace-pre-wrap">
                  <span className="font-semibold">Corrections: </span>
                  {t.corrections}
                </p>
              )}
            </div>
          ))}
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3">{detail.summary}</p>
        </aside>
      )}
    </div>
  );
}
