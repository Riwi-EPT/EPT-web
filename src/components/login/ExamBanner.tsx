// Login banner. Copy reflects the actual exam scope: Reading, Listening (in versions
// that include it) and Writing. No Speaking/TTS.
export default function ExamBanner() {
  return (
    <div className="bg-slate-900 p-8 text-white relative overflow-hidden border-b border-slate-800">
      <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-600 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-indigo-500 rounded-full opacity-10 blur-xl"></div>

      <div className="relative z-10 space-y-2">
        <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono tracking-widest rounded uppercase font-bold border border-indigo-500/30">
          Portal oficial de evaluación
        </span>
        <h1 className="text-3xl font-display font-bold text-white leading-tight tracking-tight pt-1">
          English Placement Test
        </h1>
        <p className="text-slate-400 text-xs leading-relaxed max-w-lg font-sans">
          Una prueba de nivel que mide tu dominio de <strong>Reading</strong> y <strong>Writing</strong>{" "}
          (y de <strong>Listening</strong>, cuando tu versión lo incluye) y lo ubica en un nivel MCER (A1–C2).
        </p>
      </div>
    </div>
  );
}
