import { brandProductLines } from "@/data/brandProfileMock";

export default function ProductLines() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Product Lines
      </h2>
      <p className="mt-1 text-xs text-slate-400">Core manufacturing categories by UltraTech</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {brandProductLines.map((line) => (
          <div
            key={line.id}
            className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/60 p-5 text-center transition hover:border-sky-200 hover:bg-sky-50/40 dark:border-slate-700/40 dark:bg-slate-800/40 dark:hover:border-sky-700/40"
          >
            <span className="text-3xl">{line.icon}</span>
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">{line.name}</p>
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {line.description}
            </p>
            <span className="mt-3 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-400">
              {line.productCount} products
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
