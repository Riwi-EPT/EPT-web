import { User, Mail, BookOpen, Calendar, Clock } from "lucide-react";

// The active-version card + student identity inputs + the (accurate) time limit.
interface StudentFieldsProps {
  name: string;
  email: string;
  teacher: string;
  date: string;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onTeacher: (v: string) => void;
  onDate: (v: string) => void;
  currentVersion: string;
  durationMinutes: number;
}

export default function StudentFields({
  name,
  email,
  teacher,
  date,
  onName,
  onEmail,
  onTeacher,
  onDate,
  currentVersion,
  durationMinutes,
}: StudentFieldsProps) {
  const inputClass =
    "w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg text-slate-900 placeholder-slate-400 font-sans transition-all focus:ring-1 focus:ring-indigo-500 outline-none text-sm";

  return (
    <>
      {/* Active exam version */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              EXAMEN ACTIVO
            </span>
            <h2 className="text-sm font-bold text-slate-800 mt-1 font-sans">
              Evaluando Versión del Examen:{" "}
              <span className="text-indigo-600 font-mono font-extrabold">{currentVersion}</span>
            </h2>
            <p className="text-slate-500 text-[11px] leading-relaxed font-sans mt-0.5">
              La estructura técnica es idéntica en todas las versiones, pero las preguntas y lecturas
              varían.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-3xs">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[11px] font-mono font-bold text-slate-700">
              Versión {currentVersion} Activa
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label
            htmlFor="student-name-input"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono"
          >
            Full Name *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User size={15} />
            </div>
            <input
              id="student-name-input"
              type="text"
              required
              placeholder="e.g., Kate Acosta"
              value={name}
              onChange={(e) => onName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="student-email-input"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono"
          >
            Email Address *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail size={15} />
            </div>
            <input
              id="student-email-input"
              type="email"
              required
              placeholder="e.g., student@riwi.co"
              value={email}
              onChange={(e) => onEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="teacher-name-input"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono"
          >
            Teacher or Observer
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <BookOpen size={15} />
            </div>
            <input
              id="teacher-name-input"
              type="text"
              placeholder="e.g., Professor Martinez"
              value={teacher}
              onChange={(e) => onTeacher(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="test-date-input"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono"
          >
            Evaluation Date
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar size={15} />
            </div>
            <input
              id="test-date-input"
              type="date"
              value={date}
              onChange={(e) => onDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-slate-50/70 rounded-lg p-4 border border-slate-100 flex items-start gap-3">
          <Clock className="text-indigo-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="text-xs font-bold text-slate-700 font-sans">Official Time Limit</h4>
            <p className="text-slate-500 text-[11px] mt-1 leading-relaxed font-sans">
              You will have <strong>{durationMinutes} continuous minutes</strong> once the test
              starts. When the timer expires, your answers are submitted automatically for grading.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
