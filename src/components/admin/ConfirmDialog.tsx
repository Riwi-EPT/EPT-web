import { AlertTriangle, Star, Trash2 } from "lucide-react";

// A pending confirmable action (used by the question-bank destructive/activate flows).
export interface ConfirmRequest {
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  tone = "danger",
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}) {
  const isDanger = tone === "danger";
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`shrink-0 mt-0.5 ${isDanger ? "text-rose-600" : "text-indigo-600"}`}>
            {isDanger ? <AlertTriangle size={20} /> : <Star size={20} />}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">Please confirm</h3>
            <p className="text-xs text-slate-600">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg cursor-pointer ${
              isDanger ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isDanger ? <Trash2 size={13} /> : <Star size={13} />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
