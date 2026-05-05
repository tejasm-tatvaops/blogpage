import type { Comment as ForumCommentType } from "@/lib/services/comment.service";
import { ForumCommentSection } from "@/components/forums/ForumCommentSection";

type RepliesCardProps = {
  slug: string;
  initialComments: ForumCommentType[];
  bestCommentId: string | null;
  creatorFingerprint: string | null;
};

export function RepliesCard({
  slug,
  initialComments,
  bestCommentId,
  creatorFingerprint,
}: RepliesCardProps) {
  return (
    <section className="rounded-xl border border-app bg-surface p-4 shadow-sm">
      <ForumCommentSection
        slug={slug}
        initialComments={initialComments}
        bestCommentId={bestCommentId}
        creatorFingerprint={creatorFingerprint}
      />
    </section>
  );
}
