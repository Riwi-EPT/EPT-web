import { useState, useEffect, useCallback } from "react";
import type { AdminQuestionDTO, AdminVersionDTO, Skill, QuestionType } from "@jteban1/shared";
import {
  X, KeyRound, LogOut, Layers, Database, Plus, Trash2, CheckCircle, Save,
  Star, Unlock, RefreshCw, ShieldCheck,
} from "lucide-react";
import {
  adminLogin, adminLogout, adminSession,
  listVersions, createVersion, deleteVersion, activateVersion,
  listQuestions, createQuestion, updateQuestion, deleteQuestion,
} from "../adminApi";

interface AdminPanelProps {
  onClose: () => void;
  currentStudentEmail?: string;
  onUnlockEmail: (email: string) => void;
  onResetCooldown: (email: string) => void;
  currentVersion: string;
}

type Tab = "questions" | "access";

function emptyQuestion(versionId: number): AdminQuestionDTO {
  return {
    versionId,
    skill: "reading",
    type: "mcq",
    number: 1,
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

export default function AdminPanel({
  onClose,
  currentStudentEmail,
  onUnlockEmail,
  onResetCooldown,
}: AdminPanelProps) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("questions");

  const [versions, setVersions] = useState<AdminVersionDTO[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<AdminQuestionDTO[]>([]);
  const [editing, setEditing] = useState<AdminQuestionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newVersionCode, setNewVersionCode] = useState("");
  const [unlockInput, setUnlockInput] = useState(currentStudentEmail ?? "");

  useEffect(() => {
    adminSession().then((s) => setIsAuthed(s.isAdmin)).catch(() => setIsAuthed(false));
  }, []);

  const loadVersions = useCallback(async () => {
    const vs = await listVersions();
    setVersions(vs);
    setSelectedVersionId((prev) => prev ?? vs.find((v) => v.isActive)?.id ?? vs[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (isAuthed) loadVersions().catch((e) => setError(String(e)));
  }, [isAuthed, loadVersions]);

  useEffect(() => {
    if (isAuthed && selectedVersionId != null) {
      listQuestions(selectedVersionId).then(setQuestions).catch((e) => setError(String(e)));
    }
  }, [isAuthed, selectedVersionId]);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await adminLogin(password);
      setIsAuthed(true);
      setPassword("");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Login failed.");
    }
  };

  const handleLogout = async () => {
    await adminLogout().catch(() => {});
    setIsAuthed(false);
  };

  const refreshQuestions = async () => {
    if (selectedVersionId != null) setQuestions(await listQuestions(selectedVersionId));
  };

  const handleSaveQuestion = async () => {
    if (!editing) return;
    setError(null);
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

  // ── Login gate ──────────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <Overlay onClose={onClose}>
        <div className="p-8 space-y-5 max-w-sm w-full">
          <div className="flex items-center gap-2 text-slate-800">
            <KeyRound size={20} className="text-indigo-600" />
            <h2 className="font-bold text-lg">Teacher / Admin Access</h2>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Admin password"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {authError && <p className="text-xs text-rose-600">{authError}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ── Authenticated panel ───────────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose} wide>
      <div className="flex flex-col h-[80vh] w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-900">Teacher Console</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer">
              <LogOut size={13} /> Sign out
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-100">
          {([
            { id: "questions", label: "Question Bank", icon: <Database size={14} /> },
            { id: "access", label: "Access Control", icon: <Unlock size={14} /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg flex items-center gap-1.5 cursor-pointer ${
                tab === t.id ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600" : "text-slate-500"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-6 mt-3 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {tab === "questions" ? (
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
                          onClick={(e) => { e.stopPropagation(); activateVersion(v.id).then(loadVersions); }}
                          className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteVersion(v.id).then(loadVersions); }}
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
                      <h3 className="text-sm font-bold text-slate-700">
                        Questions ({questions.length})
                      </h3>
                      <button
                        onClick={() => selectedVersionId != null && setEditing(emptyQuestion(selectedVersionId))}
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
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
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
          ) : (
            // ── Access control ──────────────────────────────────────────────────
            <div className="p-6 space-y-4 max-w-md">
              <p className="text-xs text-slate-500">
                Unlock a blocked student or reset their retake cooldown (stored on this device).
              </p>
              <input
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                placeholder="student@email.com"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => unlockInput && onUnlockEmail(unlockInput)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  <Unlock size={13} /> Unlock
                </button>
                <button
                  onClick={() => unlockInput && onResetCooldown(unlockInput)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <RefreshCw size={13} /> Reset cooldown
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ── Question editor form ──────────────────────────────────────────────────────
function QuestionForm({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: AdminQuestionDTO;
  onChange: (q: AdminQuestionDTO) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (patch: Partial<AdminQuestionDTO>) => onChange({ ...value, ...patch });
  const isMcq = value.type === "mcq";
  const isEssay = value.type === "essay";

  return (
    <div className="space-y-4 max-w-2xl">
      <h3 className="text-sm font-bold text-slate-700">{value.id ? "Edit question" : "New question"}</h3>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Skill">
          <select
            value={value.skill}
            onChange={(e) => set({ skill: e.target.value as Skill })}
            className="form-input"
          >
            <option value="reading">reading</option>
            <option value="writing">writing</option>
          </select>
        </Field>
        <Field label="Type">
          <select
            value={value.type}
            onChange={(e) => set({ type: e.target.value as QuestionType })}
            className="form-input"
          >
            <option value="mcq">mcq</option>
            <option value="essay">essay</option>
          </select>
        </Field>
        <Field label="Number">
          <input type="number" value={value.number} onChange={(e) => set({ number: Number(e.target.value) })} className="form-input" />
        </Field>
        <Field label="Max points">
          <input type="number" value={value.maxPoints} onChange={(e) => set({ maxPoints: Number(e.target.value) })} className="form-input" />
        </Field>
      </div>

      <Field label="Prompt">
        <textarea value={value.prompt} onChange={(e) => set({ prompt: e.target.value })} rows={2} className="form-input" />
      </Field>

      <Field label="Passage (optional, reading)">
        <textarea value={value.passageText ?? ""} onChange={(e) => set({ passageText: e.target.value })} rows={3} className="form-input" />
      </Field>

      {isEssay && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Word min">
            <input type="number" value={value.wordMin ?? ""} onChange={(e) => set({ wordMin: e.target.value ? Number(e.target.value) : null })} className="form-input" />
          </Field>
          <Field label="Word max">
            <input type="number" value={value.wordMax ?? ""} onChange={(e) => set({ wordMax: e.target.value ? Number(e.target.value) : null })} className="form-input" />
          </Field>
          <div className="col-span-2">
            <Field label="Rubric / reference for the NLP grader (optional)">
              <textarea value={value.rubric ?? ""} onChange={(e) => set({ rubric: e.target.value })} rows={2} className="form-input" />
            </Field>
          </div>
        </div>
      )}

      {/* Options: MCQ choices (with correct) or essay topics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            {isMcq ? "Options (pick the correct one)" : "Topic choices"}
          </span>
          <button
            onClick={() =>
              set({
                options: [
                  ...value.options,
                  { key: String.fromCharCode(97 + value.options.length), text: "", isCorrect: false },
                ],
              })
            }
            className="text-xs text-indigo-600 flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {value.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            {isMcq && (
              <input
                type="radio"
                name="correct"
                checked={opt.isCorrect}
                onChange={() =>
                  set({ options: value.options.map((o, j) => ({ ...o, isCorrect: j === i })) })
                }
                title="Correct answer"
                className="cursor-pointer"
              />
            )}
            <input
              value={opt.key}
              onChange={(e) =>
                set({ options: value.options.map((o, j) => (j === i ? { ...o, key: e.target.value } : o)) })
              }
              className="form-input w-16"
              placeholder="key"
            />
            <input
              value={opt.text}
              onChange={(e) =>
                set({ options: value.options.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)) })
              }
              className="form-input flex-1"
              placeholder="text"
            />
            <button
              onClick={() => set({ options: value.options.filter((_, j) => j !== i) })}
              className="text-slate-400 hover:text-rose-600 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">
          Cancel
        </button>
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
        >
          <Save size={13} /> Save
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-xl w-full ${wide ? "max-w-4xl" : "max-w-sm"} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
