// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// ONLY STYLING CHANGES

import { ForumCard } from "./ForumCard";
import type { ForumPost } from "@/lib/forumService";

type ForumListProps = {
  posts: ForumPost[];
};

export function ForumList({ posts }: ForumListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-app p-12 text-center">
        <p className="text-sm text-faint">No posts yet. Be the first to start a discussion.</p>
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

export function ForumListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="mt-1 h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-subtle" />
          {/* Card placeholder */}
          <div className="flex-1 animate-pulse rounded-2xl border border-app bg-subtle p-5">
            <div className="mb-3 flex gap-2">
              <div className="h-4 w-14 rounded-full bg-card" />
              <div className="h-4 w-10 rounded-full bg-card" />
            </div>
            <div className="mb-2 h-5 w-3/4 rounded-lg bg-card" />
            <div className="mb-4 h-4 w-1/2 rounded-lg bg-card" />
            <div className="h-3 w-full rounded bg-card" />
            <div className="mt-1.5 h-3 w-5/6 rounded bg-card" />
            <div className="mt-4 flex gap-4">
              <div className="h-3 w-20 rounded bg-card" />
              <div className="ml-auto flex gap-3">
                <div className="h-3 w-8 rounded bg-card" />
                <div className="h-3 w-8 rounded bg-card" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
