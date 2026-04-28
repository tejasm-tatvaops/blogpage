"use client";

import { useState, useEffect } from "react";
import type { BrandProduct, StockStatus } from "@/data/brandProfileMock";
import { brandProductLines, productReviews } from "@/data/brandProfileMock";

const stockBadge: Record<StockStatus, string> = {
  "In Stock":      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Limited Stock": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Out of Stock":  "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill={i <= Math.round(value) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className={i <= Math.round(value) ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}
          aria-hidden
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function ReviewsModal({ product, onClose }: { product: BrandProduct; onClose: () => void }) {
  const reviews = productReviews[product.id] ?? [];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Reviews for ${product.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-700/60">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
              {product.name}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-sky-600 dark:text-sky-400">{product.brand}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Summary row */}
        {reviews.length > 0 && (
          <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-3 dark:border-slate-700/60">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-amber-500">{avg.toFixed(1)}</span>
              <span className="text-xs text-slate-400">/ 5</span>
            </div>
            <div>
              <StarRow value={avg} />
              <p className="mt-0.5 text-[10px] text-slate-400">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-700/40 dark:bg-emerald-900/20">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Verified Buyers</span>
            </div>
          </div>
        )}

        {/* Review list */}
        <div className="overflow-y-auto p-5">
          {reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No reviews yet for this product.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {/* Avatar initial */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                        {review.author.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{review.author}</p>
                          {review.verified && (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">{review.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StarRow value={review.rating} />
                      <p className="mt-0.5 text-[10px] text-slate-400">{review.date}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {review.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-700/60">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = { products: BrandProduct[] };

export default function ProductCatalog({ products }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewedSuppliers, setViewedSuppliers] = useState<Set<string>>(new Set());
  const [reviewProduct, setReviewProduct] = useState<BrandProduct | null>(null);

  const filtered =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Product Catalog
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Indicative pricing — actual rates vary by distributor and region
            </p>
          </div>
          <p className="text-xs text-slate-400">{filtered.length} products</p>
        </div>

        {/* Category filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeCategory === "all"
                ? "bg-sky-500 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            All
          </button>
          {brandProductLines.map((line) => (
            <button
              key={line.id}
              onClick={() => setActiveCategory(line.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeCategory === line.id
                  ? "bg-sky-500 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {line.icon} {line.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-sky-700/40"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">
                  {product.name}
                </p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stockBadge[product.stockStatus]}`}>
                  {product.stockStatus}
                </span>
              </div>

              <p className="mt-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">
                {product.brand}
              </p>

              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {product.description}
              </p>

              <div className="mt-auto pt-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      ₹{product.priceMin.toLocaleString("en-IN")}
                      {product.priceMax !== product.priceMin && (
                        <span className="text-sm font-normal text-slate-500">
                          {" "}– ₹{product.priceMax.toLocaleString("en-IN")}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">{product.unit}</p>
                  </div>
                  <span className="text-[10px] italic text-slate-400">Indicative</span>
                </div>

                <button
                  onClick={() => setViewedSuppliers((prev) => new Set(prev).add(product.id))}
                  className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold transition ${
                    viewedSuppliers.has(product.id)
                      ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                      : "bg-sky-500 text-white hover:bg-sky-400"
                  }`}
                >
                  {viewedSuppliers.has(product.id) ? "✓ Viewing Suppliers" : "View Suppliers"}
                </button>

                <button
                  onClick={() => setReviewProduct(product)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:border-sky-700/40 dark:hover:text-sky-400"
                >
                  View Feedback
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {reviewProduct && (
        <ReviewsModal product={reviewProduct} onClose={() => setReviewProduct(null)} />
      )}
    </>
  );
}
