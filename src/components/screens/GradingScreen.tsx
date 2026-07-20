import { Sparkles } from "lucide-react";

export default function GradingScreen({ progress }: { progress: string }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
      <div className="max-w-md space-y-8">
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <Sparkles size={32} className="text-indigo-400 animate-pulse" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black tracking-tight uppercase">Grading Your Exam</h2>
          <p className="text-xs font-mono text-indigo-300 uppercase tracking-wider h-8">{progress}</p>
        </div>
      </div>
    </div>
  );
}
