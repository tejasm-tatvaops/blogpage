const ratingsData = {
  overall: 4.8,
  totalReviews: 8420,
  breakdown: [
    { label: "Product Consistency",  value: 4.9 },
    { label: "Packaging Quality",    value: 4.7 },
    { label: "Value for Money",      value: 4.6 },
    { label: "Technical Support",    value: 4.8 },
    { label: "Brand Credibility",    value: 5.0 },
  ],
};

function StarRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i + 1 <= Math.round(value);
        return (
          <svg
            key={i}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            className={filled ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}
            aria-hidden
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
    </div>
  );
}

export default function BrandRatings() {
  const { overall, totalReviews, breakdown } = ratingsData;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Ratings
      </h2>
      <p className="mt-0.5 text-xs text-slate-400">Based on verified buyer feedback</p>

      {/* Overall score */}
      <div className="mt-5 flex items-center gap-4">
        <div className="text-center">
          <p className="text-5xl font-black text-amber-500">{overall.toFixed(1)}</p>
          <StarRow value={overall} />
          <p className="mt-1 text-[10px] text-slate-400">{totalReviews.toLocaleString("en-IN")} reviews</p>
        </div>

        {/* Star distribution bars */}
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct = star === 5 ? 72 : star === 4 ? 20 : star === 3 ? 5 : star === 2 ? 2 : 1;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-3 shrink-0 text-right text-[10px] text-slate-500 dark:text-slate-400">{star}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-amber-400" aria-hidden>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" style={{ height: "6px" }}>
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-[10px] text-slate-400">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-700/60">
        {breakdown.map((item) => {
          const pct = ((item.value - 1) / 4) * 100;
          return (
            <div key={item.label} className="flex items-center gap-3">
              <p className="w-40 shrink-0 text-xs text-slate-600 dark:text-slate-400">{item.label}</p>
              <div className="flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" style={{ height: "6px" }}>
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex w-14 shrink-0 items-center justify-end gap-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.value.toFixed(1)}</p>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400" aria-hidden>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
