import { useState, useEffect, useCallback } from "react";
import type { AdminQuestionDTO, AdminVersionDTO } from "@jteban1/shared";
import { Layers, Plus, Trash2, Star } from "lucide-react";
import {
  listVersions, createVersion, deleteVersion, activateVersion,
  listQuestions, createQuestion, updateQuestion, deleteQuestion,
} from "../../adminApi";
import QuestionForm from "./QuestionForm";
import type { ConfirmRequest } from "./ConfirmDialog";

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
    try {
      await createVersion(newVersionCode.trim(), `Version ${newVersionCode.trim().toUpperCase()}`);
      setNewVersionCode("");
      await loadVersions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create version.");
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
          <button
            onClick={handleAddVersion}
            className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50 cursor-pointer"
          >
            <Plus size={12} /> Add version
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
    </div>
  );
}
