"use client";

import Link from "next/link";
import { useState } from "react";
import type { BrandProduct, StockStatus } from "@/data/brandProfileMock";
import { brandProductLines } from "@/data/brandProfileMock";

const stockBadge: Record<StockStatus, string> = {
  "In Stock":      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Limited Stock": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Out of Stock":  "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const productImageByCategory: Record<string, string> = {
  cement: "/images/construction/concrete-mix-1.png",
  rmc: "/images/construction/concrete-mix-2.png",
  building: "/images/construction/brick-stack-1.png",
  putty: "/images/construction/kitchen-install-1.png",
};

const categoryLabel: Record<string, string> = {
  cement: "Cement",
  rmc: "Ready Mix",
  building: "Building Products",
  putty: "Wall Care",
};

function getUseCase(product: BrandProduct): string {
  const text = `${product.name} ${product.description}`.toLowerCase();
  if (text.includes("fast-track")) return "Used for Fast Tracking Projects";
  if (text.includes("marine") || text.includes("coastal")) return "Used for Coastal Structures";
  if (text.includes("residential")) return "Used for Residential Projects";
  if (text.includes("waterproof")) return "Used for Waterproofing";
  return "Used for Structural Works";
}

function getWeightTag(product: BrandProduct): string {
  const weightMatch = product.unit.match(/(\d+)\s*kg/i);
  if (weightMatch?.[1]) return `Weighs ${weightMatch[1]}kg`;
  return "Site-grade material";
}

function getDiscussionTopic(product: BrandProduct): string {
  const normalized = `${product.name} ${product.description}`.toLowerCase();
  if (normalized.includes("aac")) return "aac-blocks";
  if (normalized.includes("putty")) return "wall-putty";
  if (normalized.includes("waterproof")) return "waterproofing";
  if (normalized.includes("cement")) return "cement";
  if (normalized.includes("rmc") || normalized.includes("ready mix")) return "ready-mix-concrete";
  if (product.category === "building") return "building-products";
  return product.category;
}

type Props = { products: BrandProduct[] };

export default function ProductCatalog({ products }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewedSuppliers, setViewedSuppliers] = useState<Set<string>>(new Set());

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
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-sky-700/40"
            >
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageByCategory[product.category] ?? "/images/blog-default.svg"}
                  alt={product.name}
                  className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-lg font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">{product.brand}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      {categoryLabel[product.category] ?? "Product"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${stockBadge[product.stockStatus]}`}>
                      {product.stockStatus}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      TatvaOps Verified
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {product.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {getWeightTag(product)}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {getUseCase(product)}
                </span>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700/60">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Certifications & Compliance</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    BIC Verified
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ISO 9001:2015
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    CPWD & NHAI Listed
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      ₹{product.priceMin.toLocaleString("en-IN")}
                      {product.priceMax !== product.priceMin && (
                        <span className="text-2xl font-black text-slate-400">
                          {" "}– ₹{product.priceMax.toLocaleString("en-IN")}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-400">{product.unit}</p>
                  </div>
                  <span className="text-xs italic text-slate-400">Indicative</span>
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

                <Link
                  href={`/hubs/${encodeURIComponent(getDiscussionTopic(product))}`}
                  className="mt-2 block w-full rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:border-sky-700/40 dark:hover:text-sky-400"
                >
                  View Discussion
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
