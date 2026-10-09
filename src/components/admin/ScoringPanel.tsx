import { useState } from "react";
import type { AdminVersionDTO, CefrCutoff, CefrLevel, Skill, VersionScoringConfig } from "@riwi-ept/shared";
import { Plus, RotateCcw, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { updateVersion } from "../../adminApi";

// Mirrors DEFAULT_SCORING in riwi-api/src/grading/scoringConfig.ts, so the form shows
// what the server applies for fields the version does not override. Keep in step.
const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const GLOBAL_LADDER: CefrCutoff[] = [
  { min: 0.9, level: "C2" },
  { min: 0.75, level: "C1" },
  { min: 0.6, level: "B2" },
  { min: 0.45, level: "B1" },
  { min: 0.25, level: "A2" },
  { min: 0, level: "A1" },
];
const MCQ_LADDER: CefrCutoff[] = GLOBAL_LADDER.map((r) => (r.level === "A2" ? { ...r, min: 0.35 } : r));
const DEFAULT_CUTOFFS: Record<Skill, CefrCutoff[]> = {
  reading: MCQ_LADDER,
  listening: MCQ_LADDER,
  writing: GLOBAL_LADDER,
};
const DEFAULT_MAX_ABOVE_WEAKEST = 1;
const MAX_ABOVE_WEAKEST_LIMIT = 5;

const SKILL_LABEL: Record<Skill, string> = { reading: "Reading", listening: "Listening", writing: "Writing" };

/** Ladder rung as edited: min as a percentage string so partial input is not lost. */
interface RungDraft {
  pct: string;
  level: CefrLevel;
}

interface Draft {
  issuesLevel: boolean;
  maxAboveWeakest: string;
  weights: Partial<Record<Skill, string>>;
  cutoffs: Partial<Record<Skill, RungDraft[]>>;
}

/** Ratio -> percentage without float noise (0.35 -> "35"). */
const toPct = (min: number) => String(Math.round(min * 10000) / 100);

function initialDraft(stored: Partial<VersionScoringConfig> | null | undefined, skills: Skill[]): Draft {
  const s = stored ?? {};
  const max = s.maxAboveWeakest === undefined ? DEFAULT_MAX_ABOVE_WEAKEST : s.maxAboveWeakest;
  const draft: Draft = {
    issuesLevel: typeof s.issuesLevel === "boolean" ? s.issuesLevel : true,
    maxAboveWeakest: max == null ? "" : String(max),
    weights: {},
    cutoffs: {},
  };
  for (const skill of skills) {
    draft.weights[skill] = String(s.weights?.[skill] ?? 1);
    const ladder = s.cutoffs?.[skill] ?? DEFAULT_CUTOFFS[skill];
    draft.cutoffs[skill] = ladder.map((r) => ({ pct: toPct(r.min), level: r.level }));
  }
  return draft;
}

/** Builds the request body. Number parsing only; the server owns ladder and weight validation. */
function toConfig(draft: Draft, skills: Skill[]): Partial<VersionScoringConfig> {
  const weights: Partial<Record<Skill, number>> = {};
  const cutoffs: Partial<Record<Skill, CefrCutoff[]>> = {};
  for (const skill of skills) {
    weights[skill] = Number(draft.weights[skill]);
    cutoffs[skill] = (draft.cutoffs[skill] ?? []).map((r) => ({
      min: Math.round(Number(r.pct) * 100) / 10000,
      level: r.level,
    }));
  }
  const max = draft.maxAboveWeakest.trim();
  return {
    issuesLevel: draft.issuesLevel,
    maxAboveWeakest: max === "" ? null : Number(max),
    weights,
    cutoffs,
  };
}

const inputCls =
  "rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400";

/**
 * Per-version scoring settings. The parent remounts it (via `key`) when the version
 * or its stored scoring changes, so the draft re-reads the server state.
 */
export default function ScoringPanel({ version, onSaved }: { version: AdminVersionDTO; onSaved: () => void }) {
  const skills: Skill[] = version.listeningEnabled ? ["reading", "listening", "writing"] : ["reading", "writing"];
  const [draft, setDraft] = useState<Draft>(() => initialDraft(version.scoring, skills));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const send = async (scoring: Partial<VersionScoringConfig> | null) => {
    setError(null);
    setSaving(true);
    try {
      await updateVersion(version.id, { scoring });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the scoring settings.");
    } finally {
      setSaving(false);
    }
  };

  const updateLadder = (skill: Skill, fn: (rungs: RungDraft[]) => RungDraft[]) =>
    setDraft((d) => ({ ...d, cutoffs: { ...d.cutoffs, [skill]: fn(d.cutoffs[skill] ?? []) } }));

  return (
    <details className="mb-4 border border-slate-200 rounded-lg text-xs">
      <summary className="flex items-center gap-1.5 px-3 py-2 font-bold text-slate-700 cursor-pointer">
        <SlidersHorizontal size={12} /> Scoring · version {version.code}
        {version.scoring == null && <span className="font-normal text-slate-400">(defaults)</span>}
      </summary>
      <form
        className="p-3 pt-1 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(toConfig(draft, skills));
        }}
      >
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-1.5 text-slate-600">
            <input
              type="checkbox"
              checked={draft.issuesLevel}
              onChange={(e) => setDraft((d) => ({ ...d, issuesLevel: e.target.checked }))}
            />
            Issues a CEFR level
          </label>
          <label className="flex items-center gap-1.5 text-slate-600">
            Max levels above weakest skill
            <input
              type="number"
              min={0}
              max={MAX_ABOVE_WEAKEST_LIMIT}
              step={1}
              placeholder="no cap"
              aria-describedby={`max-above-hint-${version.id}`}
              value={draft.maxAboveWeakest}
              onChange={(e) => setDraft((d) => ({ ...d, maxAboveWeakest: e.target.value }))}
              className={`${inputCls} w-16`}
            />
          </label>
          <span id={`max-above-hint-${version.id}`} className="text-[10px] text-slate-400">
            Blank = no cap (0–{MAX_ABOVE_WEAKEST_LIMIT}).
          </span>
        </div>

        <fieldset className="flex flex-wrap gap-4">
          <legend className="text-[10px] font-mono uppercase text-slate-400 mb-1">Weights</legend>
          {skills.map((skill) => (
            <label key={skill} className="flex items-center gap-1.5 text-slate-600">
              {SKILL_LABEL[skill]} weight
              <input
                type="number"
                min={0}
                step="any"
                value={draft.weights[skill] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, weights: { ...d.weights, [skill]: e.target.value } }))}
                className={`${inputCls} w-16`}
              />
            </label>
          ))}
        </fieldset>

        <div className="grid gap-3 md:grid-cols-3">
          {skills.map((skill) => {
            const label = SKILL_LABEL[skill];
            const rungs = draft.cutoffs[skill] ?? [];
            return (
              <fieldset key={skill} className="border border-slate-100 rounded p-2 space-y-1">
                <legend className="px-1 text-[10px] font-mono uppercase text-slate-400">{label} cut-offs</legend>
                <p className="text-[10px] text-slate-400">Highest first; the lowest min must be 0.</p>
                {rungs.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      aria-label={`${label} rung ${i + 1} min %`}
                      value={r.pct}
                      onChange={(e) =>
                        updateLadder(skill, (rs) => rs.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))
                      }
                      className={`${inputCls} w-16`}
                    />
                    <span className="text-slate-400">% →</span>
                    <select
                      aria-label={`${label} rung ${i + 1} level`}
                      value={r.level}
                      onChange={(e) =>
                        updateLadder(skill, (rs) =>
                          rs.map((x, j) => (j === i ? { ...x, level: e.target.value as CefrLevel } : x))
                        )
                      }
                      className={inputCls}
                    >
                      {CEFR_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ${label} rung ${i + 1}`}
                      onClick={() => updateLadder(skill, (rs) => rs.filter((_, j) => j !== i))}
                      className="text-slate-300 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  aria-label={`Add ${label} rung`}
                  onClick={() => updateLadder(skill, (rs) => [...rs, { pct: "0", level: "A1" }])}
                  className="flex items-center gap-1 text-[10px] text-indigo-600 hover:underline cursor-pointer"
                >
                  <Plus size={10} /> Add rung
                </button>
              </fieldset>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-rose-600 bg-rose-50 border border-rose-100 rounded p-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => send(null)}
            className="flex items-center gap-1 font-semibold text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw size={12} /> Reset to defaults
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1 font-bold bg-slate-900 text-white rounded-lg px-3 py-1.5 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <Save size={12} /> Save scoring
          </button>
        </div>
      </form>
    </details>
  );
}
