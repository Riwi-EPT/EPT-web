import { useState } from "react";
import { KeyRound } from "lucide-react";
import Overlay from "./Overlay";

// Teacher/admin login gate. Password is validated server-side (adminApi.adminLogin);
// this component just collects it and surfaces the error.
export default function AdminLogin({
  onClose,
  onSubmit,
  error,
}: {
  onClose: () => void;
  onSubmit: (password: string) => void;
  error: string | null;
}) {
  const [password, setPassword] = useState("");

  return (
    <Overlay onClose={onClose}>
      <div className="p-8 space-y-5 max-w-sm w-full">
        <div className="flex items-center gap-2 text-slate-800">
          <KeyRound size={20} className="text-indigo-600" />
          <h2 className="font-bold text-lg">Teacher / Admin Access</h2>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit(password)}
          placeholder="Admin password"
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(password)}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </div>
    </Overlay>
  );
}
