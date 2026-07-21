import { useState, useEffect, useCallback } from "react";
import { Unlock, RefreshCw, ShieldAlert } from "lucide-react";
import { listBlockedEmails, unblockEmail, type BlockedEmailDTO } from "../../adminApi";

// Anti-cheat email block management. The block itself is server-side/durable now
// (issue: server-side email block) — this lists the real blocklist and unblocks
// via the admin API, so an unblock actually takes effect (previously a per-device
// localStorage edit that gave no feedback and didn't affect the student's device).
export default function AccessControlTab({
  currentStudentEmail,
  onEmailUnblocked,
  onResetCooldown,
  setError,
}: {
  currentStudentEmail?: string;
  onEmailUnblocked: (email: string) => void;
  onResetCooldown: (email: string) => void;
  setError: (msg: string | null) => void;
}) {
  const [blocked, setBlocked] = useState<BlockedEmailDTO[]>([]);
  const [resetInput, setResetInput] = useState(currentStudentEmail ?? "");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBlocked(await listBlockedEmails());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the blocked-emails list.");
    }
  }, [setError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = async (row: BlockedEmailDTO) => {
    setError(null);
    setNotice(null);
    try {
      await unblockEmail(row.id);
      setBlocked((prev) => prev.filter((b) => b.id !== row.id));
      setNotice(`Unblocked ${row.email}.`);
      onEmailUnblocked(row.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unblock this email.");
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Blocked emails (server-side, durable) */}
      <div className="space-y-3 max-w-xl">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <ShieldAlert size={15} /> Blocked emails ({blocked.length})
        </h3>
        <p className="text-xs text-slate-500">
          Reported automatically when a student abandons the exam tab (anonymous flow only).
          Unblocking here takes effect immediately, on any device.
        </p>
        {notice && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}
        <div className="space-y-2">
          {blocked.map((row) => (
            <div key={row.id} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{row.email}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {row.name} · {row.reason} · {row.blockedAt}
                </div>
              </div>
              <button
                onClick={() => handleUnblock(row)}
                className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer"
              >
                <Unlock size={13} /> Unblock
              </button>
            </div>
          ))}
          {blocked.length === 0 && (
            <p className="text-xs text-slate-400 py-6 text-center">No blocked emails.</p>
          )}
        </div>
      </div>

      {/* Retake cooldown reset (local, this-device — unrelated to the block above) */}
      <div className="space-y-3 max-w-xl border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-500">
          Reset a student's retake cooldown. This affects only self-service records
          stored on this device — it does not reset the server-side cooldown for
          students who launched from Moodle (LTI).
        </p>
        <input
          value={resetInput}
          onChange={(e) => setResetInput(e.target.value)}
          placeholder="student@email.com"
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={() => resetInput && onResetCooldown(resetInput)}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw size={13} /> Reset cooldown
        </button>
      </div>
    </div>
  );
}
