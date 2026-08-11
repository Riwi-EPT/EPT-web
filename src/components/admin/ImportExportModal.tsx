import { useState } from "react";
import { Download, Upload, KeyRound, X } from "lucide-react";
import type { AdminVersionDTO } from "@riwi-ept/shared";
import { exportVersions, importVersions, type ExamBundle, type ImportedVersionSummary } from "../../adminApi";
import { downloadJson, exportFilename } from "../../lib/downloadJson";

/**
 * Export selected exam versions to a JSON file, and import one back.
 *
 * Renders its own backdrop at z-[110] rather than reusing `Overlay` (pinned to z-[100],
 * the same layer as the AdminPanel this opens over) — the same reason ConfirmDialog
 * hand-rolls its backdrop.
 *
 * Import is additive by design: the server creates NEW versions and suffixes a
 * colliding code (A -> A-2). Nothing existing is ever overwritten, so no import can
 * disturb the questions that past attempts are graded against.
 */
export default function ImportExportModal({
  versions,
  onClose,
  onImported,
  setError,
}: {
  versions: AdminVersionDTO[];
  onClose: () => void;
  /** Called after a successful import so the caller can refresh + select. */
  onImported: (summaries: ImportedVersionSummary[]) => void;
  setError: (msg: string | null) => void;
}) {
  const [selected, setSelected] = useState<string[]>(versions.map((v) => v.code));
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<ImportedVersionSummary[] | null>(null);

  const allSelected = selected.length === versions.length && versions.length > 0;

  const toggle = (code: string) =>
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  const handleExport = async () => {
    if (!selected.length) return;
    setError(null);
    setBusy(true);
    try {
      // Ordered as displayed, so the filename reads predictably.
      const codes = versions.map((v) => v.code).filter((c) => selected.includes(c));
      const bundle = await exportVersions(codes);
      downloadJson(exportFilename(codes), bundle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export the selected versions.");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setImported(null);
    setBusy(true);
    try {
      // Parsed in the browser and POSTed as ordinary JSON — the API registers no
      // multipart parser, so an uploaded file would arrive as an empty body.
      const bundle = JSON.parse(await file.text()) as ExamBundle;
      const { imported: summaries } = await importVersions(bundle);
      setImported(summaries);
      onImported(summaries);
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "That file isn't valid JSON."
          : e instanceof Error
            ? e.message
            : "Could not import that file."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Import / Export versions</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Export ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Export
              </h4>
              <button
                onClick={() => setSelected(allSelected ? [] : versions.map((v) => v.code))}
                className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {versions.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(v.code)}
                    onChange={() => toggle(v.code)}
                    className="cursor-pointer shrink-0"
                  />
                  <span className="font-bold">{v.code}</span>
                  <span className="text-slate-400 truncate">{v.name}</span>
                </label>
              ))}
              {!versions.length && <p className="text-xs text-slate-400">No versions yet.</p>}
            </div>

            {/* The file is a complete answer key and outlives this session. Say so here,
                where the decision to download is actually being made. */}
            <p className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <KeyRound size={12} className="shrink-0 mt-0.5" />
              <span>
                The file includes the correct answers, so it can be re-imported. Store and
                share it accordingly.
              </span>
            </p>

            <button
              onClick={handleExport}
              disabled={busy || !selected.length}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-40"
            >
              <Download size={13} />
              Export {selected.length || "no"} version{selected.length === 1 ? "" : "s"}
            </button>
          </section>

          <hr className="border-slate-150" />

          {/* ── Import ── */}
          <section className="space-y-2">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Import
            </h4>
            <p className="text-[10px] text-slate-500">
              Imported versions are always added as new and left inactive. A code that
              already exists gets a suffix.
            </p>
            <label className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-2 hover:bg-indigo-50 cursor-pointer">
              <Upload size={13} />
              Choose a JSON file
              <input
                type="file"
                accept="application/json,.json"
                aria-label="Exam version JSON file"
                disabled={busy}
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  // Reset so re-picking the same file fires onChange again.
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>

            {imported && (
              <ul className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 space-y-0.5">
                {imported.map((i) => (
                  <li key={i.code}>
                    <span className="font-bold">{i.code}</span> — {i.questionCount} question
                    {i.questionCount === 1 ? "" : "s"}
                    {i.renamedFrom && ` (renamed from ${i.renamedFrom})`}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
