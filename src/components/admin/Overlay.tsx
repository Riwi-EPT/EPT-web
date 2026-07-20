import type { ReactNode } from "react";

// Modal backdrop + centered card. Click-outside closes; inner clicks don't.
export default function Overlay({
  children,
  onClose,
  wide,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-xl w-full ${wide ? "max-w-4xl" : "max-w-sm"} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
