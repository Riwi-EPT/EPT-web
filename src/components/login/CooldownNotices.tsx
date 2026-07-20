import { ShieldAlert, Clock, Award } from "lucide-react";
import { isValidEmail, formatCooldownRemaining } from "../../lib/format";

// The three mutually-exclusive self-service access notices shown under the form:
// permanently blocked (anti-cheat), retake cooldown active, or cooldown cleared.
// All are local (this-device) records; see App's localStorage-backed cooldown.
interface CooldownNoticesProps {
  email: string;
  isBlocked: boolean;
  cooldownTime: number | null;
  attemptsCount: number;
}

export default function CooldownNotices({
  email,
  isBlocked,
  cooldownTime,
  attemptsCount,
}: CooldownNoticesProps) {
  if (!isValidEmail(email)) return null;

  if (isBlocked) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-5 flex items-start gap-3.5 text-red-900 animate-fade-in shadow-xs"
        id="cheater-permanently-blocked-warning"
      >
        <ShieldAlert size={24} className="text-red-600 shrink-0 mt-0.5 animate-bounce" />
        <div className="space-y-1.5">
          <h4 className="text-xs font-black font-sans uppercase tracking-widest text-red-950 flex items-center gap-2">
            <span>🔴 ACCESO BLOQUEADO PERMANENTEMENTE</span>
          </h4>
          <p className="text-[12px] text-red-700 leading-relaxed font-sans">
            El correo electrónico <strong className="text-red-950 font-bold">{email}</strong> fue{" "}
            <strong>bloqueado definitivamente</strong> por nuestro sistema de detección y supervisión
            automatizado de RIWI.
          </p>
          <div className="bg-red-100/50 rounded-lg p-3 text-[11px] text-red-800 font-sans border border-red-200/50 leading-relaxed">
            <strong>Razón del bloqueo:</strong> Se detectó que el estudiante intentó abrir otra
            pestaña, abandonar la ventana activa del examen o cambiar de aplicación mientras realizaba
            la prueba. Para preservar la pulcritud, honestidad y validez oficial del examen, esta
            cuenta ha sido anulada y <strong>no se permite volver a presentar la prueba</strong>.
          </div>
        </div>
      </div>
    );
  }

  if (cooldownTime !== null) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-lg p-5 flex items-start gap-3.5 text-rose-800 animate-fade-in">
        <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-rose-950">
            Acceso Bloqueado por Cooldown (72 HORAS REQUERIDAS)
          </h4>
          <p className="text-[11px] text-rose-700 leading-relaxed font-sans">
            El correo electrónico <strong className="text-rose-950 font-bold">{email}</strong> ya ha
            registrado una sesión anteriormente. Para mantener la integridad del proceso de
            evaluación, se implementa un intervalo mínimo obligatorio de <strong>72 horas</strong>{" "}
            antes de poder presentar el examen de nuevo.
          </p>
          <div className="pt-2 flex items-center gap-1.5 font-mono text-xs text-rose-600 font-bold">
            <Clock size={16} className="text-rose-500 animate-pulse" />
            <span>Tiempo restante para desbloquear: {formatCooldownRemaining(cooldownTime)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (attemptsCount > 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4.5 flex items-start gap-3.5 text-emerald-800 animate-fade-in">
        <Award size={20} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-emerald-950">
            Acceso Habilitado (Cooldown de 72h Concluido)
          </h4>
          <p className="text-[11px] text-emerald-700 leading-relaxed font-sans">
            Has realizado <strong>{attemptsCount} intento(s)</strong> anteriormente con este correo
            electrónico. ¡Tu tiempo de espera ha concluido! Tienes acceso habilitado para realizar tu
            próximo intento del examen ahora mismo.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
