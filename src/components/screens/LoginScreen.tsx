import { GraduationCap, Settings } from "lucide-react";
import StudentForm from "../StudentForm";
import type { StudentInfo } from "../../types";

export default function LoginScreen({
  onStart,
  currentVersion,
  onOpenAdmin,
}: {
  onStart: (info: StudentInfo) => void;
  currentVersion: string;
  onOpenAdmin: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
        <GraduationCap size={44} className="text-slate-900" />
        <StudentForm onStart={onStart} currentVersion={currentVersion} />
        <button
          onClick={onOpenAdmin}
          className="text-xs text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1 mt-4 font-sans font-bold uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-lg"
        >
          <Settings size={13} />
          Acceso Administrador (Docentes)
        </button>
      </div>
    </div>
  );
}
