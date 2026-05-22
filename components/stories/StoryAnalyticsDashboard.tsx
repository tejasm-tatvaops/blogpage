"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type StoryAnalytic = {
  id: string;
  text: string | null;
  story_type: string;
  created_at: string;
  is_expired: boolean;
  views_count: number;
  reactions_count: number;
  reply_count: number;
  completion_rate: number;
  ranking_score: number;
  tags: string[];
  reaction_breakdown: Record<string, number>;
};

type Summary = {
  total_stories: number;
  total_views: number;
  total_reactions: number;
  avg_completion_rate: number;
};

const REACTION_EMOJI: Record<string, string> = {
  fire: "🔥",
  clap: "👏",
  insightful: "💡",
  question: "❓",
  heart: "❤️",
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CompletionBar({ pct }: { pct: number }) {
  const color =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface/20">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-app bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-app">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function StoryAnalyticsDashboard() {
  const [stories, setStories] = useState<StoryAnalytic[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/stories/analytics");
        if (!res.ok) throw new Error("fetch failed");
        const json = (await res.json()) as { stories: StoryAnalytic[]; summary: Summary };
        setStories(json.stories);
        setSummary(json.summary);
      } catch {
        setError("Could not load story analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface/20" />
          ))}
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface/20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-6 text-center">
        <p className="text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-8 text-center">
        <p className="text-lg font-semibold text-app">No stories yet</p>
        <p className="mt-1 text-sm text-muted">Post your first story to see analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Stories" value={summary.total_stories} />
          <StatCard label="Total Views" value={summary.total_views.toLocaleString()} />
          <StatCard label="Reactions" value={summary.total_reactions.toLocaleString()} />
          <StatCard
            label="Avg Completion"
            value={`${summary.avg_completion_rate}%`}
            sub="% of viewers finished"
          />
        </div>
      )}

      {/* Per-story breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Story Breakdown</h3>
        {stories.map((story) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-app bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {story.story_type}
                  </span>
                  {story.is_expired && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                      Expired
                    </span>
                  )}
                  <span className="text-[11px] text-muted">{formatRelativeTime(story.created_at)}</span>
                </div>
                {story.text && (
                  <p className="mt-1 text-sm font-medium text-app line-clamp-2">{story.text}</p>
                )}
                {story.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {story.tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] text-muted">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Metrics row */}
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-app">{story.views_count}</p>
                <p className="text-[10px] text-muted">Views</p>
              </div>
              <div>
                <p className="text-lg font-bold text-app">{story.reactions_count}</p>
                <p className="text-[10px] text-muted">Reactions</p>
              </div>
              <div>
                <p className="text-lg font-bold text-app">{story.reply_count}</p>
                <p className="text-[10px] text-muted">Replies</p>
              </div>
            </div>

            {/* Completion bar */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] text-muted">Completion rate</span>
                <span className="text-[10px] font-bold text-app">
                  {Math.round(story.completion_rate * 100)}%
                </span>
              </div>
              <CompletionBar pct={Math.round(story.completion_rate * 100)} />
            </div>

            {/* Reaction breakdown */}
            {Object.keys(story.reaction_breakdown).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(story.reaction_breakdown).map(([type, count]) => (
                  <span
                    key={type}
                    className="flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-app"
                  >
                    {REACTION_EMOJI[type] ?? "•"} {count}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
