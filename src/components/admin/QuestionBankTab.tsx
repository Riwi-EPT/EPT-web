import { useState, useEffect, useCallback } from "react";
import type { AdminQuestionDTO, AdminVersionDTO } from "@riwi-ept/shared";
import type { ImportedVersionSummary } from "../../adminApi";
import { Layers, Plus, Trash2, Star, Clock, ArrowDownUp } from "lucide-react";
import ImportExportModal from "./ImportExportModal";
import {
  listVersions, createVersion, updateVersion, deleteVersion, activateVersion,
  listQuestions, createQuestion, updateQuestion, deleteQuestion,
} from "../../adminApi";
import QuestionForm from "./QuestionForm";
import type { ConfirmRequest } from "./ConfirmDialog";

// Mirrors the server-side bounds in routes/admin.ts (60s..8h) so an out-of-range
// value is caught before the round trip.
const MIN_MINUTES = 1;
const MAX_MINUTES = 480;
const DEFAULT_DURATION_SECONDS = 3600;

// Mirrors MIN/MAX_QUESTION_TIME_LIMIT_SECONDS in db/admin.ts.
const MIN_QUESTION_TIME_LIMIT_SECONDS = 10;
const MAX_QUESTION_TIME_LIMIT_SECONDS = 3600;

function emptyQuestion(versionId: number, nextNumber = 1): AdminQuestionDTO {
  return {
    versionId,
    skill: "reading",
    type: "mcq",
    number: nextNumber,
    prompt: "",
    passageText: "",
    rubric: "",
    wordMin: null,
    wordMax: null,
    maxPoints: 1,
    position: 0,
    timeLimitSeconds: null,
    options: [
      { key: "a", text: "", isCorrect: true },
      { key: "b", text: "", isCorrect: false },
    ],
  };
}

// Self-contained question-bank feature: version list + question list/editor.
// Owns its own data; bubbles errors + confirmations up to the panel.
export default function QuestionBankTab({
  requestConfirm,
  setError,
}: {
  requestConfirm: (req: ConfirmRequest) => void;
  setError: (msg: string | null) => void;
}) {
  const [versions, setVersions] = useState<AdminVersionDTO[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<AdminQuestionDTO[]>([]);
  const [editing, setEditing] = useState<AdminQuestionDTO | null>(null);
  const [newVersionCode, setNewVersionCode] = useState("");
  const [newVersionMinutes, setNewVersionMinutes] = useState("60");
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  // Per-version draft of the duration field, so typing doesn't fire a PUT per
  // keystroke. Committed on blur / Enter, then cleared so the row reflects the server.
  const [minuteDrafts, setMinuteDrafts] = useState<Record<number, string>>({});

  const loadVersions = useCallback(async () => {
    const vs = await listVersions();
    setVersions(vs);
    setSelectedVersionId((prev) => prev ?? vs.find((v) => v.isActive)?.id ?? vs[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadVersions().catch((e) => setError(String(e)));
  }, [loadVersions, setError]);

  useEffect(() => {
    if (selectedVersionId != null) {
      listQuestions(selectedVersionId).then(setQuestions).catch((e) => setError(String(e)));
    }
  }, [selectedVersionId, setError]);

  const refreshQuestions = async () => {
    if (selectedVersionId != null) setQuestions(await listQuestions(selectedVersionId));
  };

  const handleSaveQuestion = async () => {
    if (!editing) return;
    setError(null);

    // Client-side validation before hitting the API.
    if (!editing.prompt.trim()) {
      setError("Prompt is required.");
      return;
    }
    if (editing.type === "mcq") {
      const filled = editing.options.filter((o) => o.text.trim());
      if (filled.length < 2) {
        setError("Multiple-choice questions need at least two options.");
        return;
      }
      if (!editing.options.some((o) => o.isCorrect && o.text.trim())) {
        setError("Select the correct option.");
        return;
      }
    }
    if (
      editing.timeLimitSeconds != null &&
      (!Number.isInteger(editing.timeLimitSeconds) ||
        editing.timeLimitSeconds < MIN_QUESTION_TIME_LIMIT_SECONDS ||
        editing.timeLimitSeconds > MAX_QUESTION_TIME_LIMIT_SECONDS)
    ) {
      setError(
        `Time limit must be blank or a whole number between ${MIN_QUESTION_TIME_LIMIT_SECONDS} and ${MAX_QUESTION_TIME_LIMIT_SECONDS} seconds.`
      );
      return;
    }

    try {
      if (editing.id) await updateQuestion(editing.id, editing);
      else await createQuestion(editing);
      setEditing(null);
      await refreshQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save question.");
    }
  };

  const handleDeleteQuestion = async (id?: number) => {
    if (!id) return;
    await deleteQuestion(id).catch((e) => setError(String(e)));
    await refreshQuestions();
  };

  const handleDeleteVersion = async (id: number) => {
    setError(null);
    try {
      await deleteVersion(id);
      if (selectedVersionId === id) setSelectedVersionId(null);
      await loadVersions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete version.");
    }
  };

  const handleAddVersion = async () => {
    if (!newVersionCode.trim()) return;
    setError(null);
    const minutes = Number(newVersionMinutes);
    if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
      setError(`Duration must be a whole number between ${MIN_MINUTES} and ${MAX_MINUTES} minutes.`);
      return;
    }
    try {
      await createVersion(
        newVersionCode.trim(),
        `Version ${newVersionCode.trim().toUpperCase()}`,
        minutes * 60
      );
      setNewVersionCode("");
      setNewVersionMinutes("60");
      await loadVersions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create version.");
    }
  };

  /**
   * Refresh after an import and jump to the first imported version.
   *
   * `loadVersions` alone would not move the selection — it preserves the current one
   * (`prev ?? …`), so the admin would be left looking at whatever they had selected
   * before and reasonably conclude nothing happened.
   */
  const handleImported = async (summaries: ImportedVersionSummary[]) => {
    const vs = await listVersions();
    setVersions(vs);
    const first = summaries[0] && vs.find((v) => v.code === summaries[0].code);
    if (first) {
      setSelectedVersionId(first.id);
      setEditing(null);
    }
  };

  /** Commit a duration edit. No-op when unchanged, so a stray blur costs nothing. */
  const commitDuration = async (v: AdminVersionDTO) => {
    const draft = minuteDrafts[v.id];
    if (draft === undefined) return;

    const clear = () => setMinuteDrafts((prev) => {
      const { [v.id]: _dropped, ...rest } = prev;
      return rest;
    });

    const minutes = Number(draft);
    if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
      setError(`Duration must be a whole number between ${MIN_MINUTES} and ${MAX_MINUTES} minutes.`);
      clear();
      return;
    }
    if (minutes * 60 === (v.durationSeconds ?? DEFAULT_DURATION_SECONDS)) {
      clear();
      return;
    }

    setError(null);
    try {
      await updateVersion(v.id, { durationSeconds: minutes * 60 });
      clear();
      await loadVersions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the duration.");
      clear();
    }
  };

  return (
    <div className="flex h-full">
      {/* Versions sidebar */}
      <div className="w-56 border-r border-slate-100 p-4 space-y-3 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400">
          <Layers size={12} /> Versions
        </div>
        {versions.map((v) => (
          <div
            key={v.id}
            className={`rounded-lg border p-2.5 text-xs cursor-pointer ${
              selectedVersionId === v.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200"
            }`}
            onClick={() => {
              setSelectedVersionId(v.id);
              setEditing(null);
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">{v.code}</span>
              {v.isActive && <Star size={12} className="text-amber-500 fill-amber-400" />}
            </div>

            {/* Per-version time limit. Editing an active version only affects
                attempts started afterwards — a running attempt keeps the deadline
                it was given (see attempts.expires_at). */}
            <label className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500">
              <Clock size={11} className="shrink-0" />
              <input
                type="number"
                aria-label={`Time limit in minutes for version ${v.code}`}
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                value={
                  minuteDrafts[v.id] ??
                  String(Math.round((v.durationSeconds ?? DEFAULT_DURATION_SECONDS) / 60))
                }
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setMinuteDrafts((prev) => ({ ...prev, [v.id]: e.target.value }))
                }
                onBlur={() => commitDuration(v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-12 rounded border border-slate-200 px-1 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              min
            </label>

            <div className="flex gap-2 mt-1.5">
              {!v.isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    requestConfirm({
                      message: `Make version "${v.code}" the active exam? Students will immediately receive this version.`,
                      confirmLabel: "Activate",
                      tone: "primary",
                      onConfirm: () => { activateVersion(v.id).then(loadVersions); },
                    });
                  }}
                  className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                >
                  Activate
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requestConfirm({
                    message: `Delete version "${v.code}" and all of its questions? This cannot be undone.`,
                    onConfirm: () => handleDeleteVersion(v.id),
                  });
                }}
                className="text-[10px] text-rose-500 hover:underline cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <input
            value={newVersionCode}
            onChange={(e) => setNewVersionCode(e.target.value)}
            placeholder="New code (E)"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <label className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock size={11} className="shrink-0" />
            <input
              type="number"
              aria-label="Time limit in minutes for the new version"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={newVersionMinutes}
              onChange={(e) => setNewVersionMinutes(e.target.value)}
              className="w-14 rounded border border-slate-200 px-1 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            min limit
          </label>
          <button
            onClick={handleAddVersion}
            className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50 cursor-pointer"
          >
            <Plus size={12} /> Add version
          </button>
          <button
            onClick={() => setIsImportExportOpen(true)}
            className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowDownUp size={12} /> Import / Export
          </button>
        </div>
      </div>

      {/* Questions list / editor */}
      <div className="flex-1 overflow-y-auto p-5">
        {editing ? (
          <QuestionForm
            value={editing}
            onChange={setEditing}
            onSave={handleSaveQuestion}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Questions ({questions.length})</h3>
              <button
                onClick={() =>
                  selectedVersionId != null &&
                  setEditing(
                    emptyQuestion(
                      selectedVersionId,
                      questions.reduce((m, q) => Math.max(m, q.number), 0) + 1,
                    ),
                  )
                }
                disabled={selectedVersionId == null}
                className="flex items-center gap-1 text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-40"
              >
                <Plus size={13} /> New question
              </button>
            </div>
            <div className="space-y-2">
              {questions.map((q) => (
                <div key={q.id} className="border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-slate-400">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded">{q.skill}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded">{q.type}</span>
                      <span>#{q.number}</span>
                      <span>{q.maxPoints} pt</span>
                      {q.timeLimitSeconds != null && (
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} /> {q.timeLimitSeconds}s
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800 mt-1 truncate">{q.prompt}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditing(q)} className="text-xs text-indigo-600 hover:underline cursor-pointer">
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        requestConfirm({
                          message: `Delete question #${q.number}? This cannot be undone.`,
                          onConfirm: () => handleDeleteQuestion(q.id),
                        })
                      }
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-xs text-slate-400 py-8 text-center">No questions yet.</p>
              )}
            </div>
          </>
        )}
      </div>

      {isImportExportOpen && (
        <ImportExportModal
          versions={versions}
          onClose={() => setIsImportExportOpen(false)}
          setError={setError}
          onImported={handleImported}
        />
      )}
    </div>
  );
}
