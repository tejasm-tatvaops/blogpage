"use client";

import Link from "next/link";
import type { ForumPost } from "@/lib/forumService";

type Props = {
  post: ForumPost;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleFeatured: (post: ForumPost) => void;
  isDeletingId: string | null;
  isFeatureUpdatingId: string | null;
};

const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-slate-700">{value.toFixed(3)}</span>
    </div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
    </div>
  </div>
);

const StatPill = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col items-center rounded-lg bg-subtle px-3 py-2">
    <span className="text-sm font-semibold tabular-nums text-app">{value}</span>
    <span className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
  </div>
);

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(iso));

export function PostInspector({
  post,
  onClose,
  onDelete,
  onToggleFeatured,
  isDeletingId,
  isFeatureUpdatingId,
}: Props) {
  const isDeleting = isDeletingId === post.id;
  const isUpdatingFeature = isFeatureUpdatingId === post.id;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-app bg-surface">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-app px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Inspect</p>
          <h2 className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-app">
            {post.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close inspector"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5">
          {post.is_featured && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Featured
            </span>
          )}
          {post.is_trending && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
              Trending
            </span>
          )}
          {post.badges.map((badge) => (
            <span key={badge} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {badge}
            </span>
          ))}
          {post.badges.length === 0 && !post.is_featured && !post.is_trending && (
            <span className="text-xs text-slate-400">No badges</span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          <StatPill label="Views"    value={fmt(post.view_count)} />
          <StatPill label="Net votes" value={fmt(post.upvote_count - post.downvote_count)} />
          <StatPill label="Comments" value={fmt(post.comment_count)} />
          <StatPill label="Score"    value={Math.round(post.score)} />
        </div>

        {/* Score breakdown */}
        <div>
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Score breakdown
          </p>
          <div className="space-y-2.5">
            <ScoreBar label="Quality"              value={post.quality_score}               color="bg-emerald-500" />
            <ScoreBar label="Engagement"           value={post.engagement_score}            color="bg-sky-500" />
            <ScoreBar label="Final rank"           value={post.final_rank_score}            color="bg-indigo-500" />
            <ScoreBar label="Comment quality boost" value={post.comment_quality_boost_score} color="bg-violet-400" />
          </div>
        </div>

        {/* Penalty */}
        {post.dwell_penalty_score > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-red-700">Dwell penalty</p>
            <p className="text-xs text-red-500">{post.dwell_penalty_score.toFixed(2)} accumulated</p>
          </div>
        )}

        {/* Tags */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {post.tags.length > 0 ? (
              post.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No tags</span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Author</span>
            <span className="text-slate-700">{post.author_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Tier</span>
            <span className="text-slate-700">{post.author_reputation_tier}</span>
          </div>
          <div className="flex justify-between">
            <span>Created</span>
            <span className="font-mono text-slate-600">{formatDate(post.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Updated</span>
            <span className="font-mono text-slate-600">{formatDate(post.updated_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Slug</span>
            <span className="max-w-[180px] truncate font-mono text-slate-500" title={post.slug}>
              {post.slug}
            </span>
          </div>
        </div>
      </div>

      {/* Actions footer */}
      <div className="space-y-2 border-t border-app px-4 py-3">
        <Link
          href={`/forums/${post.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-app px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-subtle"
        >
          View on site
          <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
            <path d="M2 9L9 2M9 2H4M9 2v5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggleFeatured(post)}
            disabled={isUpdatingFeature}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
              post.is_featured
                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-app bg-surface text-slate-700 hover:bg-subtle"
            }`}
          >
            {isUpdatingFeature ? "…" : post.is_featured ? "Unfeature" : "Feature"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(post.id)}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </aside>
  );
}
