import type { Comment as ForumCommentType } from "@/lib/services/comment.service";
import { ForumCommentSection } from "@/components/forums/ForumCommentSection";

type RepliesCardProps = {
  slug: string;
  tags: string[];
  initialComments: ForumCommentType[];
  bestCommentId: string | null;
  creatorFingerprint: string | null;
};

export function RepliesCard({
  slug,
  tags,
  initialComments,
  bestCommentId,
  creatorFingerprint,
}: RepliesCardProps) {
  return (
    <section className="rounded-xl border border-app bg-surface p-4 shadow-sm">
      <ForumCommentSection
        slug={slug}
        tags={tags}
        initialComments={initialComments}
        bestCommentId={bestCommentId}
        creatorFingerprint={creatorFingerprint}
      />
    </section>
  );
}
