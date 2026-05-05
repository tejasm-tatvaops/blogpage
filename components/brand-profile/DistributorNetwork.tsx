import { distributorZones, brandProfile } from "@/data/brandProfileMock";

const zoneColors: Record<string, { bg: string; border: string; text: string; chip: string }> = {
  "South India":   { bg: "bg-sky-50 dark:bg-sky-900/20",     border: "border-sky-200 dark:border-sky-700/40",   text: "text-sky-700 dark:text-sky-400",    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  "West India":    { bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-700/40", text: "text-violet-700 dark:text-violet-400", chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  "North India":   { bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-200 dark:border-amber-700/40",  text: "text-amber-700 dark:text-amber-400",  chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  "East India":    { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-700/40", text: "text-emerald-700 dark:text-emerald-400", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  "Central India": { bg: "bg-rose-50 dark:bg-rose-900/20",    border: "border-rose-200 dark:border-rose-700/40",   text: "text-rose-700 dark:text-rose-400",    chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

export default function DistributorNetwork() {
  const totalCities = distributorZones.reduce((sum, z) => sum + z.cities.length, 0);
  const totalSuppliers = distributorZones.reduce((sum, z) => sum + z.supplierCount, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Distributor Network
      </h2>
      <p className="mt-0.5 text-xs text-slate-400">
        Supplier and distributor footprint across India
      </p>

      {/* Summary pills */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700/40 dark:bg-slate-800/40">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-500" aria-hidden>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div>
            <p className="text-base font-black text-slate-900 dark:text-white">{totalCities}+</p>
            <p className="text-[10px] text-slate-400">Cities Covered</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700/40 dark:bg-slate-800/40">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-500" aria-hidden>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div>
            <p className="text-base font-black text-slate-900 dark:text-white">{totalSuppliers.toLocaleString("en-IN")}+</p>
            <p className="text-[10px] text-slate-400">Active Suppliers</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700/40 dark:bg-slate-800/40">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <div>
            <p className="text-base font-black text-slate-900 dark:text-white">{brandProfile.stats.activeDistributors.toLocaleString("en-IN")}+</p>
            <p className="text-[10px] text-slate-400">Distributors</p>
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="mt-5 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/30">
        <div className="text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-slate-300 dark:text-slate-600" aria-hidden>
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <p className="mt-1.5 text-xs text-slate-400">Interactive map coming soon</p>
        </div>
      </div>

      {/* Zone grid */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {distributorZones.map((zone) => {
          const c = zoneColors[zone.zone] ?? zoneColors["South India"];
          return (
            <div
              key={zone.zone}
              className={`rounded-xl border p-4 ${c.bg} ${c.border}`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs font-bold ${c.text}`}>{zone.zone}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.chip}`}>
                  {zone.supplierCount} suppliers
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {zone.cities.map((city) => (
                  <span
                    key={city}
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {city}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
