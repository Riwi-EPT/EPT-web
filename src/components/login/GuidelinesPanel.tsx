// Instructions + integrity agreement. Copy describes only what the exam actually
// does — Reading (MCQ), Listening (MCQ about audio, in versions that include it)
// and Writing (essays graded automatically). No speaking, TTS, or microphone.
interface GuidelinesPanelProps {
  agreeTerms: boolean;
  onAgreeChange: (v: boolean) => void;
}

export default function GuidelinesPanel({ agreeTerms, onAgreeChange }: GuidelinesPanelProps) {
  return (
    <>
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
          Instrucciones importantes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 font-sans">
          <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
            <span className="font-bold text-slate-800 block mb-1">📖 Reading</span>
            Preguntas de selección múltiple de gramática y comprensión, calificadas automáticamente
            con la clave de respuestas.
          </div>
          <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
            <span className="font-bold text-slate-800 block mb-1">🎧 Listening</span>
            Si tu examen lo incluye: preguntas de selección múltiple sobre audios cortos. Usa
            audífonos. Cada audio se puede reproducir un número limitado de veces, sin retroceder.
          </div>
          <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
            <span className="font-bold text-slate-800 block mb-1">✍️ Writing</span>
            Textos cortos con un número de palabras objetivo. Escribe directamente en el editor; no se
            usa micrófono.
          </div>
          <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
            <span className="font-bold text-slate-800 block mb-1">🎓 Calificación automática</span>
            Tu escritura se califica con criterios del MCER para ubicarte en un nivel (A1–C2).
          </div>
        </div>
      </div>

      <div className="border border-indigo-100 bg-indigo-50/30 rounded-lg p-4 flex items-start gap-3">
        <input
          id="agree-checkbox"
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => onAgreeChange(e.target.checked)}
          className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
        />
        <label
          htmlFor="agree-checkbox"
          className="text-xs text-slate-600 leading-relaxed select-none cursor-pointer font-sans"
        >
          He leído las instrucciones y certifico que presentaré esta prueba con integridad académica,
          de forma individual y sin ayuda de diccionarios, traductores ni otras personas.
        </label>
      </div>
    </>
  );
}
