import { brandProfile } from "@/data/brandProfileMock";

export default function BrandInsights() {
  const { positives, negatives } = brandProfile.aiInsights;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-900/30">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-600 dark:text-sky-400" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Brand Insights
          </h2>
          <p className="text-[10px] text-slate-400">AI-powered analysis of market signals</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Positives */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-700/30 dark:bg-emerald-900/10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Why buyers choose this brand
          </p>
          <ul className="space-y-2">
            {positives.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Negatives */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-700/30 dark:bg-amber-900/10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Points to consider
          </p>
          <ul className="space-y-2">
            {negatives.map((n) => (
              <li key={n} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
