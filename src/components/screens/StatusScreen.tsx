import type { ReactNode } from "react";

// Full-screen centered status message (LTI connecting / LTI error, etc.).
export default function StatusScreen({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 font-sans text-slate-700 px-6 text-center">
      {icon}
      {children}
    </div>
  );
}
