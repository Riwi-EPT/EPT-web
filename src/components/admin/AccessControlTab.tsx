import { useState } from "react";
import { Unlock, RefreshCw } from "lucide-react";

// Unlock a blocked student / reset their retake cooldown. These act ONLY on the
// local (this-device) self-service anti-cheat records via the callbacks from App.
// LTI students are gated by the server-side cooldown (attempts table), which this
// panel cannot reset — that would need a dedicated admin endpoint (follow-up).
export default function AccessControlTab({
  currentStudentEmail,
  onUnlockEmail,
  onResetCooldown,
}: {
  currentStudentEmail?: string;
  onUnlockEmail: (email: string) => void;
  onResetCooldown: (email: string) => void;
}) {
  const [unlockInput, setUnlockInput] = useState(currentStudentEmail ?? "");

  return (
    <div className="p-6 space-y-4 max-w-md">
      <p className="text-xs text-slate-500">
        Unlock a blocked student or reset their retake cooldown. This affects only
        self-service records stored on this device — it does not reset the server-side
        cooldown for students who launched from Moodle (LTI).
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
  );
}
