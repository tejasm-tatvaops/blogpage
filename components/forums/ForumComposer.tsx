"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrCreateFingerprint } from "@/lib/personalization";
import type { ForumPost } from "@/lib/forumService";
import { brandProducts, type BrandProduct } from "@/data/brandProfileMock";

const TAGS_PLACEHOLDER = "construction, project-management, tools";

const STOCK_COLORS: Record<string, string> = {
  "In Stock":      "bg-emerald-50 text-emerald-700",
  "Limited Stock": "bg-amber-50 text-amber-700",
  "Out of Stock":  "bg-red-50 text-red-700",
};

export function ForumComposer() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [fingerprint, setFingerprint] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [linkedProduct, setLinkedProduct] = useState<BrandProduct | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  // Close product dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(e.target as Node)) {
        setProductOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredProducts = brandProducts.filter((p) => {
    const q = productSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  // Establish fingerprint on mount (client-only)
  useEffect(() => {
    setFingerprint(getOrCreateFingerprint());
  }, []);

  const parseTags = (raw: string): string[] =>
    raw
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean)
      .slice(0, 10);

  // ── AI Improve ───────────────────────────────────────────────────────────────
  const handleAiImprove = async () => {
    if (!title.trim() || !content.trim()) {
      setImproveError("Add a title and some content first.");
      return;
    }
    setImproveError(null);
    setImproving(true);
    try {
      const res = await fetch("/api/forums/ai-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const json = (await res.json()) as {
        error?: string;
        improved?: { title: string; content: string; tags: string[] };
      };
      if (!res.ok) throw new Error(json.error ?? "AI improvement failed.");

      if (json.improved) {
        setTitle(json.improved.title);
        setContent(json.improved.content);
        // Merge suggested tags with existing ones (deduplicated)
        const existing = parseTags(tagsRaw);
        const merged = [...new Set([...existing, ...json.improved.tags])].slice(0, 10);
        setTagsRaw(merged.join(", "));
      }
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : "AI improvement failed.");
    } finally {
      setImproving(false);
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          tags: parseTags(tagsRaw),
          author_name: authorName.trim() || "Anonymous",
          creator_fingerprint: fingerprint,
          linked_product_id:    linkedProduct?.id ?? null,
          linked_product_name:  linkedProduct?.name ?? null,
          linked_product_brand: linkedProduct?.brand ?? null,
        }),
      });

      const json = (await res.json()) as { error?: string; post?: ForumPost };
      if (!res.ok) throw new Error(json.error ?? "Failed to create post.");

      router.push(`/forums/${json.post!.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post.");
      setSubmitting(false);
    }
  };

  // ── Markdown toolbar ─────────────────────────────────────────────────────────
  const insertMarkdown = (before: string, after = "") => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = `${before}${selected || "text"}${after}`;
    const next = content.slice(0, start) + replacement + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length + (selected || "text").length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const inputClass =
    "w-full rounded-lg border border-app bg-surface px-3 py-2.5 text-sm text-app outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2";

  const tags = parseTags(tagsRaw);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="forum-title" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Title
        </label>
        <input
          id="forum-title"
          type="text"
          placeholder="What's your discussion about?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          required
          className={inputClass}
        />
        <p className="mt-1 text-right text-xs text-slate-400">{title.length}/300</p>
      </div>

      {/* Author */}
      <div>
        <label htmlFor="forum-author" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Your name <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="forum-author"
          type="text"
          placeholder="Anonymous"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={80}
          className={inputClass}
        />
      </div>

      {/* Content */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="forum-content" className="text-sm font-semibold text-slate-700">
            Content <span className="font-normal text-slate-400">(Markdown supported)</span>
          </label>
          {/* AI Improve button */}
          <button
            type="button"
            onClick={handleAiImprove}
            disabled={improving || !title.trim() || !content.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Let AI improve your title, content, and suggest tags"
          >
            {improving ? (
              <>
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Improving…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
                Improve with AI
              </>
            )}
          </button>
        </div>

        {improveError && (
          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {improveError}
          </p>
        )}

        {/* Markdown toolbar */}
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {[
            { label: "B", title: "Bold", action: () => insertMarkdown("**", "**") },
            { label: "I", title: "Italic", action: () => insertMarkdown("_", "_") },
            { label: "`", title: "Code", action: () => insertMarkdown("`", "`") },
            { label: "H2", title: "Heading", action: () => insertMarkdown("## ") },
            { label: "—", title: "Divider", action: () => insertMarkdown("\n---\n") },
          ].map(({ label, title: btnTitle, action }) => (
            <button
              key={label}
              type="button"
              title={btnTitle}
              onClick={action}
              className="rounded border border-app bg-surface px-2 py-1 text-xs font-mono text-slate-600 transition hover:bg-slate-100"
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          id="forum-content"
          ref={contentRef}
          placeholder="Share what you know, ask a question, or start a debate…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={50_000}
          rows={12}
          required
          className={`${inputClass} font-mono text-xs leading-6`}
        />
        <p className="mt-1 text-right text-xs text-slate-400">{content.length}/50,000</p>
      </div>

      {/* Products */}
      <div ref={productRef}>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Products <span className="font-normal text-slate-400">(optional)</span>
        </label>

        {linkedProduct ? (
          /* ── Selected product card ── */
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{linkedProduct.name}</span>
                <span className="text-xs text-slate-400">{linkedProduct.brand}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STOCK_COLORS[linkedProduct.stockStatus] ?? "bg-slate-100 text-slate-600"}`}>
                  {linkedProduct.stockStatus}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                ₹{linkedProduct.priceMin.toLocaleString("en-IN")} – ₹{linkedProduct.priceMax.toLocaleString("en-IN")}{" "}
                <span className="text-slate-400">{linkedProduct.unit}</span>
              </p>
              <Link
                href="/brand-profile"
                target="_blank"
                className="mt-1 inline-block text-[11px] font-medium text-indigo-600 hover:underline"
              >
                View on brand profile →
              </Link>
            </div>
            <button
              type="button"
              onClick={() => { setLinkedProduct(null); setProductSearch(""); }}
              className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Remove product"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          /* ── Search + dropdown ── */
          <div className="relative">
            <div className="flex items-center rounded-lg border border-app bg-surface px-3 py-2.5 ring-indigo-400 transition focus-within:ring-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 shrink-0 text-slate-400" aria-hidden>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search products to link…"
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setProductOpen(true); }}
                onFocus={() => setProductOpen(true)}
                className="flex-1 bg-transparent text-sm text-app outline-none placeholder:text-slate-400"
              />
            </div>

            {productOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                {filteredProducts.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400">No products found</p>
                ) : (
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {filteredProducts.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => { setLinkedProduct(p); setProductOpen(false); setProductSearch(""); }}
                          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.brand} · ₹{p.priceMin.toLocaleString("en-IN")}–{p.priceMax.toLocaleString("en-IN")} {p.unit}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STOCK_COLORS[p.stockStatus] ?? "bg-slate-100 text-slate-600"}`}>
                            {p.stockStatus}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="forum-tags" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Tags <span className="font-normal text-slate-400">(comma-separated, max 10)</span>
        </label>
        <input
          id="forum-tags"
          type="text"
          placeholder={TAGS_PLACEHOLDER}
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          className={inputClass}
        />
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-app px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-subtle"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim() || !content.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold !text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Publishing…" : "Publish post"}
        </button>
      </div>
    </form>
  );
}
