import { GraduationCap } from "lucide-react";
import type { ResultDTO } from "@jteban1/shared";
import ReviewTab from "../ReviewTab";

export default function ResultsScreen({
  result,
  onReset,
}: {
  result: ResultDTO;
  onReset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap size={20} className="text-indigo-600" />
          English Placement Test Results
        </h1>
        <ReviewTab result={result} onReset={onReset} />
      </div>
    </div>
  );
}
