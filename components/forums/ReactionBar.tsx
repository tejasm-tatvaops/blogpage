import { ForumVoteBar } from "@/components/forums/ForumVoteBar";
import { ForumShareButtons } from "@/components/forums/ForumShareButtons";
import { BookmarkButton } from "@/components/blog/BookmarkButton";

type ReactionBarProps = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  commentCount: number;
};

export function ReactionBar({
  slug,
  title,
  excerpt,
  content,
  tags,
  upvotes,
  downvotes,
  commentCount,
}: ReactionBarProps) {
  return (
    <div className="mb-6 space-y-3 rounded-2xl border border-app bg-surface p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <ForumVoteBar
          slug={slug}
          initialUpvotes={upvotes}
          initialDownvotes={downvotes}
          commentCount={commentCount}
        />
        <BookmarkButton slug={slug} title={title} excerpt={excerpt} />
      </div>
      <ForumShareButtons title={title} slug={slug} excerpt={excerpt} content={content} tags={tags} />
    </div>
  );
}
