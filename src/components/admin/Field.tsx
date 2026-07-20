import type { ReactNode } from "react";

// Labeled form control used across the question editor.
export default function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  );
}
