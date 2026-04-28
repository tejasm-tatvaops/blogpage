import { brandProfile } from "@/data/brandProfileMock";

const stats = [
  {
    label: "Total Products",
    value: brandProfile.stats.totalProducts.toString(),
    suffix: "",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-900/20",
  },
  {
    label: "Market Share",
    value: brandProfile.stats.marketShare.toString(),
    suffix: "%",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
  },
  {
    label: "Avg Rating",
    value: brandProfile.stats.avgRating.toFixed(1),
    suffix: "",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" aria-hidden>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    label: "Total Reviews",
    value: brandProfile.stats.totalReviews.toLocaleString("en-IN"),
    suffix: "",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    label: "Active Distributors",
    value: brandProfile.stats.activeDistributors.toLocaleString("en-IN"),
    suffix: "+",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
  },
];

export default function BrandStats() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${s.bg} ${s.color}`}>
            {s.icon}
          </span>
          <p className={`mt-3 text-2xl font-black ${s.color}`}>
            {s.value}
            <span className="text-lg">{s.suffix}</span>
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
