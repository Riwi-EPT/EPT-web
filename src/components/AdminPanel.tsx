import { useState, useEffect } from "react";
import { X, LogOut, Database, Unlock, ShieldCheck, Users } from "lucide-react";
import { adminLogin, adminLogout, adminSession } from "../adminApi";
import Overlay from "./admin/Overlay";
import AdminLogin from "./admin/AdminLogin";
import QuestionBankTab from "./admin/QuestionBankTab";
import AccessControlTab from "./admin/AccessControlTab";
import UsersTab from "./admin/UsersTab";
import ConfirmDialog, { type ConfirmRequest } from "./admin/ConfirmDialog";

interface AdminPanelProps {
  onClose: () => void;
  currentStudentEmail?: string;
  onUnlockEmail: (email: string) => void;
  onResetCooldown: (email: string) => void;
  currentVersion: string;
}

type Tab = "questions" | "access" | "users";

export default function AdminPanel({
  onClose,
  currentStudentEmail,
  onUnlockEmail,
  onResetCooldown,
}: AdminPanelProps) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("questions");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    adminSession()
      .then((s) => {
        setIsAuthed(s.authenticated);
        setIsAdmin(s.isAdmin);
        setCurrentEmail(s.email);
      })
      .catch(() => setIsAuthed(false));
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await adminLogin(email, password);
      setIsAuthed(true);
      setIsAdmin(res.isAdmin);
      setCurrentEmail(res.email);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Login failed.");
    }
  };

  const handleLogout = async () => {
    await adminLogout().catch(() => {});
    setIsAuthed(false);
    setIsAdmin(false);
    setCurrentEmail(null);
    setTab("questions");
  };

  if (!isAuthed) {
    return <AdminLogin onClose={onClose} onSubmit={handleLogin} error={authError} />;
  }

  // Admin-only "Users" tab; teachers who aren't admins never see it.
  const tabs = [
    { id: "questions" as const, label: "Question Bank", icon: <Database size={14} /> },
    { id: "access" as const, label: "Access Control", icon: <Unlock size={14} /> },
    ...(isAdmin ? [{ id: "users" as const, label: "Users", icon: <Users size={14} /> }] : []),
  ];

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
            <div className="flex items-center gap-3">
              {currentEmail && (
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {currentEmail}
                  {isAdmin && <span className="ml-1 text-[10px] font-mono uppercase text-indigo-600">· admin</span>}
                </span>
              )}
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
            {tabs.map((t) => (
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
            {tab === "questions" && <QuestionBankTab requestConfirm={setConfirm} setError={setError} />}
            {tab === "access" && (
              <AccessControlTab
                currentStudentEmail={currentStudentEmail}
                onUnlockEmail={onUnlockEmail}
                onResetCooldown={onResetCooldown}
              />
            )}
            {tab === "users" && isAdmin && (
              <UsersTab currentEmail={currentEmail} requestConfirm={setConfirm} setError={setError} />
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
