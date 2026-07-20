import { useState, useEffect, useCallback } from "react";
import { UserPlus, ShieldCheck, RotateCcw, Power } from "lucide-react";
import { listUsers, createUser, updateUser, type AdminUserDTO } from "../../adminApi";
import Field from "./Field";
import type { ConfirmRequest } from "./ConfirmDialog";

// Admin-only account management (issue #10). Admins list/create teachers, toggle
// admin rights, reset passwords, and activate/deactivate accounts.
export default function UsersTab({
  currentEmail,
  requestConfirm,
  setError,
}: {
  currentEmail: string | null;
  requestConfirm: (req: ConfirmRequest) => void;
  setError: (msg: string | null) => void;
}) {
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load users.");
    }
  }, [setError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setError(null);
    try {
      await createUser(email.trim(), password, isAdmin);
      setEmail("");
      setPassword("");
      setIsAdmin(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create user.");
    }
  };

  const patch = async (id: number, body: { isActive?: boolean; isAdmin?: boolean; password?: string }) => {
    setError(null);
    try {
      await updateUser(id, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update user.");
    }
  };

  const resetPassword = (u: AdminUserDTO) => {
    const pw = window.prompt(`New password for ${u.email} (min 8 chars):`);
    if (pw) patch(u.id, { password: pw });
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Create */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3 max-w-xl">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <UserPlus size={15} /> Add teacher / admin
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="teacher@riwi.co" className="form-input" />
          </Field>
          <Field label="Password (min 8)">
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className="form-input" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="cursor-pointer" />
          Grant admin rights (can manage users)
        </label>
        <button
          onClick={handleCreate}
          disabled={!email.trim() || password.length < 8}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UserPlus size={13} /> Create account
        </button>
      </div>

      {/* List */}
      <div className="space-y-2 max-w-xl">
        <h3 className="text-sm font-bold text-slate-700">Accounts ({users.length})</h3>
        {users.map((u) => (
          <div key={u.id} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800 truncate">{u.email}</span>
                {u.isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                    <ShieldCheck size={11} /> admin
                  </span>
                )}
                {!u.isActive && (
                  <span className="text-[10px] font-mono uppercase text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">inactive</span>
                )}
                {currentEmail === u.email && <span className="text-[10px] text-slate-400">(you)</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs">
              <button onClick={() => resetPassword(u)} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 cursor-pointer" title="Reset password">
                <RotateCcw size={13} /> Password
              </button>
              <button
                onClick={() => patch(u.id, { isAdmin: !u.isAdmin })}
                className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 cursor-pointer"
                title={u.isAdmin ? "Revoke admin" : "Make admin"}
              >
                <ShieldCheck size={13} /> {u.isAdmin ? "Revoke" : "Make admin"}
              </button>
              <button
                onClick={() =>
                  requestConfirm({
                    message: `${u.isActive ? "Deactivate" : "Reactivate"} "${u.email}"?`,
                    confirmLabel: u.isActive ? "Deactivate" : "Reactivate",
                    tone: u.isActive ? "danger" : "primary",
                    onConfirm: () => patch(u.id, { isActive: !u.isActive }),
                  })
                }
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 cursor-pointer"
                title={u.isActive ? "Deactivate" : "Reactivate"}
              >
                <Power size={13} /> {u.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">No accounts yet.</p>}
      </div>
    </div>
  );
}
