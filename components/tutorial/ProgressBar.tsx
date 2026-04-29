"use client";

export function ProgressBar({
  totalSections,
  completedSections,
}: { 
  totalSections: number;
  completedSections: number;
}) {
  const percent = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  return (
    <div className="mb-6 rounded-xl border border-app bg-surface p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-app">Lesson Progress</p>
        <p className="text-xs text-slate-500">
          {completedSections} / {totalSections} sections completed
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-subtle">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}
