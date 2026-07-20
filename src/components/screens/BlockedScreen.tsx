import { ShieldAlert, Settings } from "lucide-react";

export default function BlockedScreen({
  email,
  onExit,
  onOpenAdmin,
}: {
  email: string;
  onExit: () => void;
  onOpenAdmin: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
      <div className="max-w-xl space-y-8 bg-slate-900 border border-red-950 p-8 md:p-12 rounded-2xl shadow-2xl">
        <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 mx-auto">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">EXAMEN BLOQUEADO</h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          El sistema detectó que abandonaste la ventana del examen. El correo{" "}
          <strong className="text-white">{email}</strong> ha sido inhabilitado.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onExit}
            className="px-6 py-3 bg-red-950 text-red-200 border border-red-900/50 hover:bg-red-900 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Registrar otro correo / Salir
          </button>
          <button
            onClick={onOpenAdmin}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Settings size={14} />
            Desbloquear como Administrador
          </button>
        </div>
      </div>
    </div>
  );
}
