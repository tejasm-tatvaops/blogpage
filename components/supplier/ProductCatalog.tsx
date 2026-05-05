"use client";

import { useState } from "react";
import type { Product, Category, StockStatus } from "@/data/productSupplierMock";

const stockBadge: Record<StockStatus, string> = {
  "In Stock": "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Limited Stock": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Out of Stock": "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

type Props = {
  products: Product[];
  categories: Category[];
};

export default function ProductCatalog({ products, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [quoteRequested, setQuoteRequested] = useState<Set<string>>(new Set());

  const filtered =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const requestQuote = (id: string) =>
    setQuoteRequested((prev) => new Set(prev).add(id));

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Product Catalog</h2>
        <p className="text-xs text-slate-400">{filtered.length} products</p>
      </div>

      {/* Category filter tabs */}
      <div className="mt-3 flex flex-wrap gap-2">
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
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeCategory === cat.id
                ? "bg-sky-500 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {cat.icon} {cat.name}
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
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stockBadge[product.stockStatus]}`}
              >
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
              </div>

              <button
                disabled={
                  product.stockStatus === "Out of Stock" || quoteRequested.has(product.id)
                }
                onClick={() => requestQuote(product.id)}
                className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold transition ${
                  product.stockStatus === "Out of Stock"
                    ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                    : quoteRequested.has(product.id)
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-sky-500 text-white hover:bg-sky-400"
                }`}
              >
                {product.stockStatus === "Out of Stock"
                  ? "Out of Stock"
                  : quoteRequested.has(product.id)
                  ? "✓ Quote Requested"
                  : "Request Quote"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
