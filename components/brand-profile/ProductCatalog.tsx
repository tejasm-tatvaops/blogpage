"use client";

import { useState, useEffect } from "react";
import type { BrandProduct, StockStatus } from "@/data/brandProfileMock";
import { brandProductLines, productReviews } from "@/data/brandProfileMock";

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

type ReviewReply = {
  id: string;
  author: string;
  text: string;
  date: string;
};

type ReviewComment = {
  id: string;
  author: string;
  text: string;
  date: string;
  replies: ReviewReply[];
};

const initialDiscussionThreads: Record<string, ReviewComment[]> = {
  "bp2:r1": [
    {
      id: "c1",
      author: "Suresh Pillai",
      text: "Did you use PPC for raft foundations only or for columns too?",
      date: "2 days ago",
      replies: [
        {
          id: "cr1",
          author: "Kiran Mehta",
          text: "Mainly for raft and retaining wall pours. We used OPC for some fast-cycle column work.",
          date: "1 day ago",
        },
      ],
    },
  ],
};

function ReviewsModal({ product, onClose }: { product: BrandProduct; onClose: () => void }) {
  const reviews = productReviews[product.id] ?? [];
  const [activeDiscussionReviewId, setActiveDiscussionReviewId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ReviewComment[]>>(() => initialDiscussionThreads);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [shareMessage, setShareMessage] = useState<string | null>(null);

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
  const activeReview = reviews.find((review) => review.id === activeDiscussionReviewId) ?? null;
  const discussionKey = activeDiscussionReviewId ? `${product.id}:${activeDiscussionReviewId}` : "";
  const activeThread = activeDiscussionReviewId ? threads[discussionKey] ?? [] : [];

  const shareReview = async (review: (typeof reviews)[number]) => {
    const content = `${review.author} (${review.role}) rated ${product.name} ${review.rating}/5: "${review.text}"`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${product.name} review`, text: content });
      } else {
        await navigator.clipboard.writeText(content);
      }
      setShareMessage("Review shared.");
    } catch {
      setShareMessage("Share cancelled.");
    }
    setTimeout(() => setShareMessage(null), 1800);
  };

  const addComment = () => {
    if (!activeDiscussionReviewId) return;
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    setThreads((prev) => {
      const key = `${product.id}:${activeDiscussionReviewId}`;
      const nextComments = prev[key] ?? [];
      return {
        ...prev,
        [key]: [
          ...nextComments,
          {
            id: `c-${Date.now()}`,
            author: "You",
            text: trimmed,
            date: "Just now",
            replies: [],
          },
        ],
      };
    });
    setCommentDraft("");
  };

  const addReply = (commentId: string) => {
    if (!activeDiscussionReviewId) return;
    const draft = (replyDrafts[commentId] ?? "").trim();
    if (!draft) return;
    setThreads((prev) => {
      const key = `${product.id}:${activeDiscussionReviewId}`;
      const nextComments = (prev[key] ?? []).map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                { id: `r-${Date.now()}`, author: "You", text: draft, date: "Just now" },
              ],
            }
          : comment,
      );
      return { ...prev, [key]: nextComments };
    });
    setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
  };

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

        {/* Review list / discussion */}
        <div className="overflow-y-auto p-5">
          {reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No reviews yet for this product.</p>
          ) : activeReview ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveDiscussionReviewId(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ← Back
              </button>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-700/40 dark:bg-slate-800/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{activeReview.author}</p>
                  <StarRow value={activeReview.rating} />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{activeReview.role}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{activeReview.text}</p>
              </div>

              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-700/40">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Discussion thread
                </h4>
                <div className="mt-3 space-y-3">
                  {activeThread.length === 0 ? (
                    <p className="text-xs text-slate-400">No comments yet. Start this discussion.</p>
                  ) : (
                    activeThread.map((comment) => (
                      <div key={comment.id} className="rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/30">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{comment.author}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{comment.text}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{comment.date}</p>

                        {comment.replies.length > 0 && (
                          <div className="mt-3 space-y-2 border-l border-slate-200 pl-3 dark:border-slate-700">
                            {comment.replies.map((reply) => (
                              <div key={reply.id}>
                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{reply.author}</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400">{reply.text}</p>
                                <p className="text-[10px] text-slate-400">{reply.date}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={replyDrafts[comment.id] ?? ""}
                            onChange={(event) =>
                              setReplyDrafts((prev) => ({ ...prev, [comment.id]: event.target.value }))
                            }
                            placeholder="Write a reply"
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => addReply(comment.id)}
                            className="rounded-md bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-400"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a comment to this review"
                    className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={addComment}
                    className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {reviews.map((review) => {
                const hasDiscussion = (threads[`${product.id}:${review.id}`] ?? []).length > 0;
                return (
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

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveDiscussionReviewId(review.id)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {hasDiscussion ? "Join the discussion" : "Start a discussion"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareReview(review)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Share review
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {shareMessage && <p className="mt-3 text-center text-[11px] font-medium text-sky-600">{shareMessage}</p>}
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
