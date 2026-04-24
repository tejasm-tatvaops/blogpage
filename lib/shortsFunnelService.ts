import { connectToDatabase } from "@/lib/db/mongodb";
import { VideoPostModel } from "@/models/VideoPost";
import { BlogModel } from "@/models/Blog";
import { ForumPostModel } from "@/models/ForumPost";

type FunnelSyncResult = {
  scanned: number;
  linkedBlog: number;
  linkedForum: number;
  skipped: number;
};

const toSet = (tags: unknown): Set<string> =>
  new Set(
    Array.isArray(tags)
      ? tags.map((t) => String(t ?? "").trim().toLowerCase()).filter(Boolean)
      : [],
  );

export async function syncShortsFunnelLinks(limit = 200): Promise<FunnelSyncResult> {
  await connectToDatabase();
  const shorts = await VideoPostModel.find({ published: true, deletedAt: null })
    .sort({ updatedAt: -1 })
    .limit(Math.min(Math.max(1, limit), 500))
    .select("slug tags linkedBlogSlug linkedForumSlug category")
    .lean();

  let linkedBlog = 0;
  let linkedForum = 0;
  let skipped = 0;

  for (const short of shorts) {
    const shortTags = toSet((short as { tags?: string[] }).tags);
    if (shortTags.size === 0) {
      skipped += 1;
      continue;
    }

    const currentBlog = String((short as { linkedBlogSlug?: string | null }).linkedBlogSlug ?? "").trim();
    const currentForum = String((short as { linkedForumSlug?: string | null }).linkedForumSlug ?? "").trim();

    let nextBlog = currentBlog;
    let nextForum = currentForum;

    if (!currentBlog) {
      const blog = await BlogModel.findOne({
        deleted_at: null,
        published: true,
        tags: { $in: [...shortTags] },
      })
        .sort({ view_count: -1, created_at: -1 })
        .select("slug")
        .lean();
      nextBlog = String((blog as { slug?: string }).slug ?? "").trim();
    }

    if (!currentForum) {
      const forum = await ForumPostModel.findOne({
        deleted_at: null,
        tags: { $in: [...shortTags] },
      })
        .sort({ is_trending: -1, score: -1, comment_count: -1, created_at: -1 })
        .select("slug")
        .lean();
      nextForum = String((forum as { slug?: string }).slug ?? "").trim();
    }

    if (!nextBlog && !nextForum) {
      skipped += 1;
      continue;
    }

    await VideoPostModel.updateOne(
      { _id: short._id },
      {
        $set: {
          ...(nextBlog ? { linkedBlogSlug: nextBlog } : {}),
          ...(nextForum ? { linkedForumSlug: nextForum } : {}),
        },
      },
    );
    if (!currentBlog && nextBlog) linkedBlog += 1;
    if (!currentForum && nextForum) linkedForum += 1;
  }

  return { scanned: shorts.length, linkedBlog, linkedForum, skipped };
}

