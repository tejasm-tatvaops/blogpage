import Link from "next/link";
import { brandProducts } from "@/data/brandProfileMock";

const STOCK_COLORS: Record<string, { pill: string; dot: string }> = {
  "In Stock":      { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  "Limited Stock": { pill: "bg-amber-50  text-amber-700  border-amber-200",    dot: "bg-amber-400"   },
  "Out of Stock":  { pill: "bg-red-50    text-red-700    border-red-200",       dot: "bg-red-400"     },
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  cement:   "from-slate-600 to-slate-800",
  rmc:      "from-sky-600   to-sky-800",
  building: "from-amber-500 to-amber-700",
  putty:    "from-violet-500 to-violet-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  cement:   "🏗️",
  rmc:      "🧱",
  building: "🏢",
  putty:    "🪣",
};

export function ForumLinkedProductCard({
  productId,
  productName,
  productBrand,
}: {
  productId: string;
  productName: string;
  productBrand: string;
}) {
  const product = brandProducts.find((p) => p.id === productId);

  const gradient = product ? (CATEGORY_GRADIENTS[product.category] ?? "from-indigo-600 to-indigo-800") : "from-indigo-600 to-indigo-800";
  const icon     = product ? (CATEGORY_ICONS[product.category]     ?? "📦")                            : "📦";
  const stock    = product ? STOCK_COLORS[product.stockStatus]     : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-app bg-surface shadow-sm">
      {/* Visual header — stands in for a product image */}
      <Link href="/brand-profile" className="group block">
        <div className={`relative flex h-32 w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
          {/* Large icon as focal point */}
          <span className="text-5xl drop-shadow-lg">{icon}</span>
          {/* Brand badge */}
          <span className="absolute bottom-3 left-3 rounded-md bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            {productBrand}
          </span>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
        </div>
      </Link>

      <div className="p-4">
        {/* Section label */}
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          Referenced product
        </p>

        {/* Product name */}
        <Link
          href="/brand-profile"
          className="group/name block text-sm font-bold leading-snug text-app transition hover:text-indigo-600"
        >
          {productName}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="ml-1 inline-block opacity-0 transition group-hover/name:opacity-100"
            aria-hidden
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>

        {/* Price + stock */}
        {product && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              ₹{product.priceMin.toLocaleString("en-IN")}
              <span className="font-normal text-slate-400"> – </span>
              ₹{product.priceMax.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-slate-400">{product.unit}</span>
          </div>
        )}

        {/* Stock badge */}
        {product && stock && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${stock.dot}`} />
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stock.pill}`}>
              {product.stockStatus}
            </span>
          </div>
        )}

        {/* Description */}
        {product && (
          <p className="mt-3 text-xs leading-relaxed text-slate-500 line-clamp-3">
            {product.description}
          </p>
        )}

        {/* CTA */}
        <Link
          href="/brand-profile"
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
        >
          View product details
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
