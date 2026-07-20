import { useState, useEffect } from "react";
import { X, LogOut, Database, Unlock, ShieldCheck } from "lucide-react";
import { adminLogin, adminLogout, adminSession } from "../adminApi";
import Overlay from "./admin/Overlay";
import AdminLogin from "./admin/AdminLogin";
import QuestionBankTab from "./admin/QuestionBankTab";
import AccessControlTab from "./admin/AccessControlTab";
import ConfirmDialog, { type ConfirmRequest } from "./admin/ConfirmDialog";

interface AdminPanelProps {
  onClose: () => void;
  currentStudentEmail?: string;
  onUnlockEmail: (email: string) => void;
  onResetCooldown: (email: string) => void;
  currentVersion: string;
}

type Tab = "questions" | "access";

export default function AdminPanel({
  onClose,
  currentStudentEmail,
  onUnlockEmail,
  onResetCooldown,
}: AdminPanelProps) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("questions");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    adminSession().then((s) => setIsAuthed(s.isAdmin)).catch(() => setIsAuthed(false));
  }, []);

  const handleLogin = async (password: string) => {
    setAuthError(null);
    try {
      await adminLogin(password);
      setIsAuthed(true);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Login failed.");
    }
  };

  const handleLogout = async () => {
    await adminLogout().catch(() => {});
    setIsAuthed(false);
  };

  if (!isAuthed) {
    return <AdminLogin onClose={onClose} onSubmit={handleLogin} error={authError} />;
  }

  return (
    <>
      <Overlay onClose={onClose} wide>
        <div className="flex flex-col h-[80vh] w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" />
              <h2 className="font-bold text-slate-900">Teacher Console</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer">
                <LogOut size={13} /> Sign out
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-3 border-b border-slate-100">
            {([
              { id: "questions", label: "Question Bank", icon: <Database size={14} /> },
              { id: "access", label: "Access Control", icon: <Unlock size={14} /> },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setError(null);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg flex items-center gap-1.5 cursor-pointer ${
                  tab === t.id ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600" : "text-slate-500"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mx-6 mt-3 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            {tab === "questions" ? (
              <QuestionBankTab requestConfirm={setConfirm} setError={setError} />
            ) : (
              <AccessControlTab
                currentStudentEmail={currentStudentEmail}
                onUnlockEmail={onUnlockEmail}
                onResetCooldown={onResetCooldown}
              />
            )}
          </div>
        </div>
      </Overlay>

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          tone={confirm.tone}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}
    </>
  );
}
