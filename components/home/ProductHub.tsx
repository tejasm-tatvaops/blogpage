import Link from "next/link";
import { brandProducts } from "@/data/brandProfileMock";

const CATEGORY_GRADIENTS: Record<string, string> = {
  cement:   "from-orange-500 via-orange-600 to-amber-700",
  rmc:      "from-sky-500 via-sky-600 to-slate-700",
  building: "from-amber-500 via-amber-600 to-orange-700",
  putty:    "from-violet-500 via-violet-600 to-indigo-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  cement:   "🏗️",
  rmc:      "🧱",
  building: "🏢",
  putty:    "🪣",
};

const STOCK_STYLES: Record<string, { pill: string; dot: string }> = {
  "In Stock":      { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500" },
  "Limited Stock": { pill: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",           dot: "bg-amber-400"  },
  "Out of Stock":  { pill: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",                        dot: "bg-red-400"    },
};

const FEATURED_IDS = ["bp7", "bp1", "bp2", "bp5", "bp4", "bp8"];

/** Map knowledge-hub slug to `brandProducts` category when we can infer a match. */
function mapHubSlugToProductCategory(slug: string): string | null {
  const s = decodeURIComponent(slug).trim().toLowerCase();
  if (!s) return null;
  if (s.includes("putty")) return "putty";
  if (s.includes("waterproof")) return "building";
  if (s.includes("aac") || s.includes("block")) return "building";
  if (s.includes("rmc") || s.includes("ready-mix") || s.includes("ready mix")) return "rmc";
  if (s.includes("cement")) return "cement";
  return null;
}

function buildFeaturedProducts(hubSlug?: string): typeof brandProducts {
  const defaults = FEATURED_IDS.map((id) => brandProducts.find((p) => p.id === id)).filter(Boolean) as typeof brandProducts;
  if (!hubSlug?.trim()) return defaults;

  const cat = mapHubSlugToProductCategory(hubSlug);
  if (!cat) return defaults;

  const inCategory = brandProducts.filter((p) => p.category === cat);
  if (inCategory.length === 0) return defaults;

  const out: typeof brandProducts = [];
  const seen = new Set<string>();
  for (const p of inCategory) {
    if (out.length >= 6) break;
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  for (const p of defaults) {
    if (out.length >= 6) break;
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

export type ProductHubProps = {
  /** When set, prefer catalog items in the matching product category, then pad with defaults. */
  hubSlug?: string;
  /** Human label for the hub (e.g. from `humanizeHubSlug`) — used in the subtitle. */
  topicLabel?: string;
  className?: string;
};

export function ProductHub({ hubSlug, topicLabel, className }: ProductHubProps = {}) {
  const featured = buildFeaturedProducts(hubSlug);
  const subtitle = topicLabel?.trim()
    ? `Materials related to ${topicLabel}`
    : "Featured building materials";

  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(20,25,45,0.7)]${className ? ` ${className}` : ""}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">
            Product Hub
          </p>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-900 dark:text-white">{subtitle}</h2>
        </div>
        <Link
          href="/brand-profile"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/8 bg-white px-3 py-1.5 text-[0.72rem] font-medium text-slate-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-orange-400"
        >
          View all
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {featured.map((product) => {
          const gradient = CATEGORY_GRADIENTS[product.category] ?? "from-indigo-500 via-indigo-600 to-slate-700";
          const icon     = CATEGORY_ICONS[product.category] ?? "📦";
          const stock    = STOCK_STYLES[product.stockStatus];

          return (
            <div
              key={product.id}
              className="group flex w-[200px] shrink-0 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:border-white/10 dark:bg-[rgba(20,25,45,0.9)]"
            >
              {/* Gradient header */}
              <Link href="/brand-profile" className="relative block h-[88px] shrink-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                {/* Icon */}
                <span className="absolute inset-0 flex items-center justify-center text-4xl drop-shadow-md">
                  {icon}
                </span>
                {/* Brand badge */}
                <span className="absolute bottom-2 left-2 rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  {product.brand}
                </span>
              </Link>

              {/* Body */}
              <div className="flex flex-1 flex-col p-3">
                {/* Label */}
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  Referenced Product
                </p>

                {/* Name */}
                <Link
                  href="/brand-profile"
                  className="text-[0.8rem] font-bold leading-snug text-slate-900 transition group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400 line-clamp-2"
                >
                  {product.name}
                </Link>

                {/* Price */}
                <p className="mt-1.5 text-[0.8rem] font-semibold text-slate-800 dark:text-white/90">
                  ₹{product.priceMin.toLocaleString("en-IN")}
                  <span className="font-normal text-slate-400 dark:text-white/40"> – </span>
                  ₹{product.priceMax.toLocaleString("en-IN")}
                  <span className="ml-1 text-[10px] font-normal text-slate-400 dark:text-white/40">
                    {product.unit}
                  </span>
                </p>

                {/* Stock */}
                {stock && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stock.dot}`} />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stock.pill}`}>
                      {product.stockStatus}
                    </span>
                  </div>
                )}

                {/* Description */}
                <p className="mt-2 flex-1 text-[0.72rem] leading-relaxed text-slate-500 dark:text-white/50 line-clamp-3">
                  {product.description}
                </p>

                {/* CTA */}
                <Link
                  href="/brand-profile"
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:bg-indigo-700"
                >
                  View product details
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
