import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";
import type { ForumPost } from "@/lib/forumService";
import { brandProducts } from "@/data/brandProfileMock";

// ─── helpers ────────────────────────────────────────────────────────────────

export type ResolvedProduct = (typeof brandProducts)[number] | null;

export function resolveProductBySlug(slug: string): ResolvedProduct {
  // try direct id match first (e.g. "bp1")
  const byId = brandProducts.find((p) => p.id === slug);
  if (byId) return byId;
  // try slugified name (e.g. "ultratech-opc-53-grade")
  return (
    brandProducts.find(
      (p) =>
        p.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") === slug,
    ) ?? null
  );
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

// ─── ProductHeader ───────────────────────────────────────────────────────────

export function ProductHeader({
  product,
  productSlug,
  discussionCount,
  articleCount,
}: {
  product: ResolvedProduct;
  productSlug: string;
  discussionCount: number;
  articleCount: number;
}) {
  const displayName = product?.name ?? productSlug;
  const category = product?.category ?? "product";

  return (
    <header className="mb-10">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-app">Home</Link>
        <span aria-hidden className="text-faint">/</span>
        <Link href="/forums" className="transition hover:text-app">Forums</Link>
        <span aria-hidden className="text-faint">/</span>
        <span className="font-medium text-app">{displayName}</span>
      </nav>

      {/* Category badge */}
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-app bg-subtle px-3 py-1 text-sm font-semibold text-muted">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        {category}
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-app sm:text-4xl">
        {displayName}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {discussionCount} discussion{discussionCount !== 1 ? "s" : ""}
        <span className="mx-1.5 text-faint" aria-hidden>·</span>
        {articleCount} article{articleCount !== 1 ? "s" : ""}
      </p>
    </header>
  );
}

// ─── ProductSummaryCard (AI Summary) ─────────────────────────────────────────

function deriveSummaryPoints(discussions: ForumPost[]): string[] {
  if (discussions.length === 0) return [];

  const points: string[] = [];

  // pull first non-empty excerpts, truncated to ~120 chars
  for (const post of discussions.slice(0, 6)) {
    const excerpt = post.excerpt?.trim();
    if (excerpt && excerpt.length > 20) {
      const truncated = excerpt.length > 120 ? excerpt.slice(0, 117) + "…" : excerpt;
      points.push(truncated);
    }
    if (points.length >= 5) break;
  }

  return points;
}

export function ProductSummaryCard({
  product,
  discussions,
}: {
  product: ResolvedProduct;
  discussions: ForumPost[];
}) {
  const points = deriveSummaryPoints(discussions);
  const highEngagement = discussions.filter((d) => (d.engagement_score ?? 0) > 0.5).length;
  const avgQuality = discussions.length
    ? Math.round(
        (discussions.reduce((s, d) => s + (d.quality_score ?? 0), 0) / discussions.length) * 100,
      )
    : 0;

  return (
    <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-500">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M12 2l2 6h6l-5 3.6 1.9 5.9L12 14l-4.9 3.5 1.9-5.9L4 8h6z"/>
            </svg>
            AI Summary
          </p>
          <h2 className="text-sm font-bold text-app">
            {product?.name ?? "Community Insights"}
          </h2>
        </div>

        {discussions.length > 0 && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-orange-500 ring-1 ring-orange-500/20">
              Based on {discussions.length} discussion{discussions.length !== 1 ? "s" : ""}
            </span>
            {avgQuality > 0 && (
              <span className="rounded-full bg-subtle px-2.5 py-0.5 text-[10px] font-semibold text-muted">
                Avg quality {avgQuality}%
              </span>
            )}
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <p className="text-sm text-faint">No community discussions yet for this product.</p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[9px] font-bold text-orange-500">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{pt}</span>
              </li>
            ))}
          </ul>

          {highEngagement > 0 && (
            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-faint">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {highEngagement} high-engagement thread{highEngagement !== 1 ? "s" : ""} on this product
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── ProductDiscussionList ───────────────────────────────────────────────────

export function ProductDiscussionList({
  discussions,
  productSlug,
}: {
  discussions: ForumPost[];
  productSlug: string;
}) {
  return (
    <section aria-labelledby="discussions-heading">
      <h2 id="discussions-heading" className="mb-5 text-lg font-bold text-app">
        Discussions
      </h2>

      {discussions.length === 0 ? (
        <p className="text-sm text-faint">No discussions for this product yet.</p>
      ) : (
        <ul className="space-y-3">
          {discussions.map((post) => (
            <li key={post.id}>
              <Link
                href={`/forums/${post.slug}`}
                className="group flex flex-col gap-1 rounded-xl border border-app bg-surface p-4 shadow-sm transition hover:shadow-md hover:border-orange-500/25"
              >
                {/* Badges */}
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  {post.is_trending && (
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-400 ring-1 ring-orange-500/20">
                      🔥 Trending
                    </span>
                  )}
                  {post.is_featured && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400 ring-1 ring-amber-500/20">
                      ⭐ Featured
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold leading-snug text-app transition group-hover:text-orange-500 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs text-muted line-clamp-2">{post.excerpt}</p>

                {/* Footer meta */}
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[11px] text-faint">
                    <span className="font-medium text-muted">{post.author_name}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-faint">
                    <span className="inline-flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                      {formatCount(post.upvote_count)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      {formatCount(post.comment_count)}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <Link
          href={`/forums?tag=${encodeURIComponent(productSlug)}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-app bg-subtle px-4 py-2 text-sm font-medium text-muted transition hover:bg-card hover:text-app"
        >
          Browse all discussions
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
      </div>
    </section>
  );
}

// ─── ProductArticleList ──────────────────────────────────────────────────────

export function ProductArticleList({
  articles,
  productSlug,
}: {
  articles: BlogPost[];
  productSlug: string;
}) {
  return (
    <section aria-labelledby="articles-heading">
      <h2 id="articles-heading" className="mb-5 text-lg font-bold text-app">
        Articles
      </h2>

      {articles.length === 0 ? (
        <p className="text-sm text-faint">No articles for this product yet.</p>
      ) : (
        <ul className="space-y-4">
          {articles.map((post) => (
            <li key={post.id} className="group rounded-2xl border border-app bg-surface p-5 shadow-sm transition hover:shadow-md hover:border-orange-500/25">
              <Link href={`/blog/${post.slug}`} className="block">
                <span className="mb-1.5 inline-block rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-500">
                  {post.category}
                </span>
                <h3 className="text-base font-semibold leading-snug text-app transition group-hover:text-orange-500 line-clamp-2">
                  {post.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-faint">
                  <span className="font-medium text-muted">{post.author}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                  {post.view_count > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{post.view_count.toLocaleString()} views</span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {articles.length > 0 && (
        <div className="mt-5">
          <Link
            href={`/blog?tag=${encodeURIComponent(productSlug)}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-app bg-subtle px-4 py-2 text-sm font-medium text-muted transition hover:bg-card hover:text-app"
          >
            Browse all articles
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      )}
    </section>
  );
}
