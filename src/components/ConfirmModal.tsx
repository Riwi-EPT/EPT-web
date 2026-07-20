import { HelpCircle } from "lucide-react";

// Shared confirmation/notice modal (bypasses iframe-blocked native dialogs).
export interface ConfirmModalProps {
  title: string;
  body: string;
  confirmLabel: string;
  tone: "emerald" | "rose" | "slate";
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function ConfirmModal({
  title,
  body,
  confirmLabel,
  tone,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const toneClass = {
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    rose: "bg-rose-600 hover:bg-rose-700",
    slate: "bg-slate-900 hover:bg-slate-800",
  }[tone];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-6 space-y-3">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-600">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 text-left">{title}</h3>
          <p className="text-slate-500 text-xs leading-relaxed text-left">{body}</p>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${toneClass} text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
