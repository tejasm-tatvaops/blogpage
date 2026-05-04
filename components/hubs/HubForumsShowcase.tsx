import Link from "next/link";
import type { ForumPost } from "@/lib/forumService";
import { cn } from "@/lib/cn";

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 45) {
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  }
  if (day >= 1) return `${day}d ago`;
  if (hr >= 1) return `${hr}h ago`;
  if (min >= 1) return `${min}m ago`;
  return "Just now";
}

function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function excerptPreview(post: ForumPost): string | null {
  const raw = post.excerpt?.trim();
  if (raw && raw.length >= 24 && raw !== post.title.trim()) return raw;
  const fromContent = post.content?.replace(/\s+/g, " ").trim();
  if (fromContent && fromContent.length >= 24) return fromContent.slice(0, 220);
  return null;
}

export function HubForumsShowcase({
  forums,
  hubLabel,
}: {
  forums: ForumPost[];
  hubLabel: string;
}) {
  const sorted = [...forums].sort(
    (a, b) => (b.engagement_score ?? 0) - (a.engagement_score ?? 0),
  );
  const visible = sorted.slice(0, 12);

  return (
    <section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-gradient-to-b from-sky-500/[0.06] via-white to-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:from-sky-400/[0.08] dark:via-[rgba(30,41,59,0.85)] dark:to-[rgba(15,23,42,0.92)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="border-b border-black/[0.06] bg-white/60 px-5 py-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700/90 dark:text-sky-300/90">
              Community
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-app sm:text-2xl">Forum discussions</h2>
            <p className="mt-1 max-w-xl text-sm text-muted dark:text-white/65">
              Threads builders and estimators are having about{" "}
              <span className="font-semibold text-app dark:text-white/90">{hubLabel}</span>—jump in or start a new
              conversation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-black/10 bg-black/[0.04] px-3 py-1 text-xs font-semibold text-muted dark:border-white/15 dark:bg-white/10 dark:text-white/80">
              {forums.length === 0 ? "No threads yet" : `${forums.length} thread${forums.length === 1 ? "" : "s"}`}
            </span>
            <Link
              href="/forums"
              className="rounded-full border border-sky-500/35 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-500/20 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100 dark:hover:bg-sky-500/25"
            >
              Browse forums
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 md:p-6">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 bg-black/[0.02] px-6 py-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
            <p className="text-base font-medium text-app dark:text-white/90">No forum threads for this topic yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted dark:text-white/60">
              When discussions mention this hub, they will show up here with excerpts and engagement signals.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/forums/new"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400"
              >
                Start a thread
              </Link>
              <Link href="/forums" className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300">
                Explore all forums
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3 md:space-y-4">
            {visible.map((post) => {
              const preview = excerptPreview(post);
              const when = formatRelativeTime(post.created_at);
              return (
                <li key={post.id}>
                  <Link
                    href={`/forums/${post.slug}`}
                    className={cn(
                      "group relative flex flex-col gap-2 rounded-xl border border-black/[0.07] bg-white/90 p-4 shadow-sm transition",
                      "hover:border-sky-400/45 hover:shadow-[0_8px_28px_rgba(14,165,233,0.12)]",
                      "dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-sky-400/35 dark:hover:shadow-[0_10px_36px_rgba(0,0,0,0.35)]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {post.is_featured ? (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-400/20 dark:text-amber-100">
                          Featured
                        </span>
                      ) : null}
                      {post.is_trending ? (
                        <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-900 dark:bg-orange-400/20 dark:text-orange-100">
                          Trending
                        </span>
                      ) : null}
                      {post.tags?.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-app transition group-hover:text-sky-700 dark:group-hover:text-sky-300 sm:text-[1.05rem]">
                        {post.title}
                      </h3>
                      <span
                        className="mt-0.5 hidden shrink-0 text-sky-600 opacity-0 transition group-hover:opacity-100 sm:inline dark:text-sky-400"
                        aria-hidden
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="translate-x-0 transition group-hover:translate-x-0.5">
                          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                    {preview ? (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted dark:text-white/65">{preview}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/[0.05] pt-3 text-xs text-muted dark:border-white/10 dark:text-white/55">
                      <span className="font-medium text-app/90 dark:text-white/75">{post.author_name || "Member"}</span>
                      {when ? <span>{when}</span> : null}
                      <span className="inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-70" aria-hidden>
                          <path
                            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {compactCount(post.comment_count ?? 0)} repl{post.comment_count === 1 ? "y" : "ies"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-70" aria-hidden>
                          <path
                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        {compactCount(post.view_count ?? 0)} views
                      </span>
                      {(post.score ?? 0) !== 0 ? (
                        <span className="inline-flex items-center gap-1 font-medium text-app/80 dark:text-white/70">
                          Score {(post.score ?? 0) > 0 ? "+" : ""}
                          {post.score}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
