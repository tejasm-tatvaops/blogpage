import ProductCatalog from "@/components/supplier/ProductCatalog";
import { supplierProfile, categories, products } from "@/data/productSupplierMock";

const { about, performance, trustScore, ratings, aiInsights, certifications, availability, reviews } =
  supplierProfile;

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={i <= Math.round(value) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className={i <= Math.round(value) ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = ((value - 1) / 4) * 100;
  return (
    <div className="flex items-center gap-3">
      <p className="w-40 shrink-0 text-xs text-slate-600 dark:text-slate-400">{label}</p>
      <div className="flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="w-8 shrink-0 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
        {value.toFixed(1)}
      </p>
    </div>
  );
}

export default function SupplierProfilePage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 md:px-8">

      {/* ── Page breadcrumb ─────────────────────────────── */}
      <p className="mb-6 text-xs text-slate-400">
        <a href="/" className="hover:text-sky-500">Home</a>
        {" / "}
        <a href="/supplier" className="hover:text-sky-500">Product Suppliers</a>
        {" / "}
        <span className="text-slate-600 dark:text-slate-300">{supplierProfile.name}</span>
      </p>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

        {/* ═══════════════════════════════════════════════
            LEFT SIDEBAR
        ═══════════════════════════════════════════════ */}
        <aside className="w-full shrink-0 lg:w-72 lg:sticky lg:top-6">

          {/* Profile card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-sky-200 bg-slate-100 dark:border-sky-700 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={supplierProfile.avatar}
                  alt={supplierProfile.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mt-3">
                <h1 className="text-base font-bold leading-snug text-slate-900 dark:text-white">
                  {supplierProfile.name}
                </h1>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {supplierProfile.tagline}
                </p>
              </div>

              {/* Rating */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {supplierProfile.rating}
                </span>
                <div>
                  <StarRating value={supplierProfile.rating} />
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {supplierProfile.reviewCount} reviews
                  </p>
                </div>
              </div>

              {/* Verified badge */}
              {supplierProfile.verified && (
                <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  TatvaOps Verified
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-slate-100 dark:border-slate-700" />

            {/* Pricing */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Price Range
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  ₹{supplierProfile.priceRange.min}–₹{supplierProfile.priceRange.max}
                </p>
                <p className="text-[11px] text-slate-400">{supplierProfile.priceRange.unit}</p>
              </div>

              {/* Stock status */}
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {supplierProfile.stockStatus}
                </p>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>

              {/* Min order */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">Min Order</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {supplierProfile.minOrder}
                </p>
              </div>

              {/* Delivery time */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">Delivery</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {supplierProfile.deliveryTime}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-slate-100 dark:border-slate-700" />

            {/* CTA buttons */}
            <div className="flex flex-col gap-2">
              <button className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400">
                Request Quote
              </button>
              <button className="w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800/50">
                Check Availability
              </button>
            </div>
          </div>

          {/* Account Manager — sidebar card */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Account Manager
            </h3>
            <div className="mt-4 flex flex-col items-center text-center">
              <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/construction/site-team-2.png"
                  alt="Arjun Sharma"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <p className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">Arjun Sharma</p>
              <p className="mt-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">Senior Account Manager</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                12 yrs · Building Materials &amp; B2B Supply
              </p>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  ~2 hrs response
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="mailto:arjun.sharma@rajbuild.in"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:text-sky-400"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="truncate">arjun.sharma@rajbuild.in</span>
              </a>
              <a
                href="tel:+919876543210"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:text-sky-400"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.27 6.28l1.16-1.16a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                +91 98765 43210
              </a>
            </div>
          </div>

          {/* Availability & Logistics */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Availability &amp; Logistics
            </h3>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Delivery Zones
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {availability.deliveryZones.map((z) => (
                    <span
                      key={z}
                      className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {z}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Delivery Time
                </p>
                <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{availability.deliveryTime}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Bulk Order Capacity
                </p>
                <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{availability.bulkOrderCapacity}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Transport
                </p>
                <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{availability.transportAvailability}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════
            MAIN CONTENT
        ═══════════════════════════════════════════════ */}
        <main className="min-w-0 flex-1">

          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {supplierProfile.name}
                  </h2>
                  {supplierProfile.verified && (
                    <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      VERIFIED
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {supplierProfile.tagline} · {supplierProfile.yearsActive} years in business
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {about.serviceAreas.slice(0, 3).map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">
                  {supplierProfile.rating}
                </p>
                <StarRating value={supplierProfile.rating} />
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {supplierProfile.reviewCount} verified reviews
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
              {supplierProfile.description}
            </p>
          </div>

          {/* About */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              About
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Warehouse Location
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {about.warehouseLocation}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Supply Capacity
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {about.supplyCapacity}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Established
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {about.established}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  GST Number
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {about.gstNumber}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Brands Supplied
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {about.brandsSupplied.map((brand) => (
                    <span
                      key={brand}
                      className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-400"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Service Areas
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {about.serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Certifications &amp; Authorisations
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {certifications.map((cert) => (
                <div
                  key={cert.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-4 text-center transition hover:border-sky-200 hover:bg-sky-50/40 dark:border-slate-700/40 dark:bg-slate-800/40 dark:hover:border-sky-700/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-lg dark:border-sky-700/30 dark:bg-sky-900/20">
                    {cert.icon}
                  </span>
                  <p className="text-[11px] font-semibold leading-snug text-slate-700 dark:text-slate-300">
                    {cert.label}
                  </p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    Verified
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Supply Performance */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Supply Performance
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {performance.fulfillmentRate}%
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Order Fulfillment Rate
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {performance.avgDispatch}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Avg Dispatch Time
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {performance.repeatBuyers}%
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Repeat Buyers
                </p>
              </div>
            </div>
          </div>

          {/* Product Categories */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Product Categories
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center transition hover:border-sky-200 hover:bg-sky-50/40 dark:border-slate-700/40 dark:bg-slate-800/40 dark:hover:border-sky-700/40"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <p className="mt-2 text-xs font-bold text-slate-800 dark:text-white">{cat.name}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {cat.description}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                    {cat.productCount} SKUs
                  </p>
                </div>
              ))}
            </div>

            {/* Product Catalog placed below categories */}
            <ProductCatalog products={products} categories={categories} />
          </div>

          {/* Trust Score + Ratings Breakdown — combined */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Trust &amp; Ratings
            </h3>

            <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Left — Trust Score */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Trust Score</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-sky-600 dark:text-sky-400">{trustScore.overall}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {trustScore.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <p className="w-44 shrink-0 text-xs text-slate-600 dark:text-slate-400">{item.label}</p>
                      <div className="flex-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                      <p className="w-8 shrink-0 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.score}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider — vertical on desktop */}
              <div className="hidden lg:block absolute left-1/2 top-6 bottom-6 w-px bg-slate-100 dark:bg-slate-700" aria-hidden />

              {/* Right — Ratings Breakdown */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Ratings Breakdown</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{ratings.overall}</span>
                    <div>
                      <StarRating value={ratings.overall} />
                      <p className="mt-0.5 text-[10px] text-slate-400">{supplierProfile.reviewCount} reviews</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {ratings.breakdown.map((item) => (
                    <RatingBar key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-900/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-600 dark:text-sky-400">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                AI Insights
              </h3>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-700/30 dark:bg-emerald-900/10">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Strengths
                </p>
                <ul className="space-y-1.5">
                  {aiInsights.positives.map((p) => (
                    <li key={p} className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                      <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-700/30 dark:bg-amber-900/10">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Watch Out
                </p>
                <ul className="space-y-1.5">
                  {aiInsights.negatives.map((n) => (
                    <li key={n} className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0 text-amber-500">!</span>
                      <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Buyer Reviews
            </h3>
            <div className="mt-4 space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{review.author}</p>
                      <p className="text-[11px] text-slate-400">{review.company}</p>
                    </div>
                    <div className="text-right">
                      <StarRating value={review.rating} />
                      <p className="mt-0.5 text-[10px] text-slate-400">{review.date}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
