import { ForumCard } from "./ForumCard";
import type { ForumPost } from "@/lib/forumService";

type ForumListProps = {
  posts: ForumPost[];
};

export function ForumList({ posts }: ForumListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
        <p className="text-sm text-slate-500">No posts yet. Be the first to start a discussion.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <ForumCard key={post.id} post={post} />
      ))}
    </div>
  );
}

// Skeleton loader — renders while async data loads
export function ForumListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
        >
          {/* Tags */}
          <div className="mb-3 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-slate-100" />
            <div className="h-5 w-12 rounded-full bg-slate-100" />
          </div>
          {/* Title */}
          <div className="mb-2 h-5 w-3/4 rounded-lg bg-slate-100" />
          <div className="mb-4 h-4 w-1/2 rounded-lg bg-slate-100" />
          {/* Excerpt */}
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="mt-1.5 h-3 w-5/6 rounded bg-slate-100" />
          {/* Meta */}
          <div className="mt-4 flex gap-4">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="ml-auto flex gap-3">
              <div className="h-3 w-8 rounded bg-slate-100" />
              <div className="h-3 w-8 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
