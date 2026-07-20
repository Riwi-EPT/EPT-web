import type { AdminQuestionDTO, Skill, QuestionType } from "@jteban1/shared";
import { Plus, Trash2, Save } from "lucide-react";
import Field from "./Field";

export default function QuestionForm({
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

  // Keys are always sequential (a, b, c…) and derived from position,
  // so authors never have to manage them by hand.
  const reletter = (opts: AdminQuestionDTO["options"]) =>
    opts.map((o, i) => ({ ...o, key: String.fromCharCode(97 + i) }));

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

      {value.skill === "reading" && (
        <Field label="Passage (optional, reading)">
          <textarea value={value.passageText ?? ""} onChange={(e) => set({ passageText: e.target.value })} rows={3} className="form-input" />
        </Field>
      )}

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
                options: reletter([...value.options, { key: "", text: "", isCorrect: false }]),
              })
            }
            className="text-xs text-indigo-600 flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {isMcq && (
          <p className="text-[11px] text-slate-400">Select the radio next to the correct answer.</p>
        )}
        {value.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            {isMcq && (
              <input
                type="radio"
                name="correct"
                checked={opt.isCorrect}
                onChange={() => set({ options: value.options.map((o, j) => ({ ...o, isCorrect: j === i })) })}
                title="Mark as correct answer"
                className="cursor-pointer shrink-0"
              />
            )}
            <span className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500 uppercase shrink-0">
              {opt.key}
            </span>
            <input
              value={opt.text}
              onChange={(e) =>
                set({ options: value.options.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)) })
              }
              className="form-input flex-1"
              placeholder={isMcq ? "Answer text" : "Topic text"}
            />
            <button
              onClick={() => set({ options: reletter(value.options.filter((_, j) => j !== i)) })}
              disabled={value.options.length <= 1}
              className="text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Remove option"
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
