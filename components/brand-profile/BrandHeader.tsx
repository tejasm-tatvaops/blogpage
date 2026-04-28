import { brandProfile } from "@/data/brandProfileMock";

export default function BrandHeader() {
  const { name, tagline, category, verified, foundedYear, marketPresence, website, description, logoInitials, logoColor } = brandProfile;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

        {/* Logo */}
        <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${logoColor} shadow-md`}>
          <span className="text-2xl font-black tracking-tight text-white">{logoInitials}</span>
        </div>

        {/* Brand info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{name}</h1>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                TatvaOps Verified
              </span>
            )}
          </div>

          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{tagline}</p>

          {/* Category pill */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-400">
              {category}
            </span>
          </div>

          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">{description}</p>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Founded <strong className="font-semibold text-slate-700 dark:text-slate-300">{foundedYear}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Market Presence: <strong className="font-semibold text-slate-700 dark:text-slate-300">{marketPresence}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <a
                href={`https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-600 hover:underline dark:text-sky-400"
              >
                {website}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
