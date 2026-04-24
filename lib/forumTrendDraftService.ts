import { connectToDatabase } from "@/lib/db/mongodb";
import { ContentIngestionJobModel } from "@/models/ContentIngestionJob";
import { ForumPostModel } from "@/models/ForumPost";

type TrendDraftResult = {
  created: number;
  skipped: number;
  failed: number;
};

const normalizeTag = (tag: string): string => tag.trim().toLowerCase();

const buildTutorialDraftContent = (title: string, sourceContent: string): string => [
  `# ${title}`,
  "",
  "## Why this matters",
  "This tutorial is derived from an active forum discussion and captures the practical workflow behind the question.",
  "",
  "## Core workflow",
  sourceContent.slice(0, 4000),
  "",
  "## Suggested implementation steps",
  "1. Identify constraints from the original forum scenario.",
  "2. Validate assumptions with a quick checklist before execution.",
  "3. Apply the workflow in a small pilot and measure results.",
  "",
  "## Common pitfalls",
  "- Missing baseline assumptions",
  "- Skipping validation before rollout",
  "- Not capturing post-implementation feedback",
].join("\n");

const buildBlogDraftContent = (title: string, sourceContent: string): string => [
  `# ${title}`,
  "",
  "## Context from community signals",
  "This draft was generated from a high-engagement forum trend to accelerate editorial review.",
  "",
  "## What teams are discussing",
  sourceContent.slice(0, 4500),
  "",
  "## Practical recommendations",
  "- Convert repeated forum pain points into documented SOPs.",
  "- Add clear acceptance criteria and rollback steps.",
  "- Track outcomes over the next 2-4 weeks and refine.",
].join("\n");

export async function generateDraftsFromForumTrends(input: {
  count: number;
  initiatorIdentityKey: string;
}): Promise<TrendDraftResult> {
  await connectToDatabase();
  const limit = Math.min(Math.max(1, Math.floor(input.count)), 12);

  const candidates = await ForumPostModel.find({
    deleted_at: null,
    $or: [
      { is_trending: true },
      { score: { $gte: 6 } },
      { comment_count: { $gte: 4 } },
    ],
  })
    .sort({ is_trending: -1, final_rank_score: -1, score: -1, comment_count: -1, created_at: -1 })
    .limit(limit * 3)
    .select("title slug content excerpt tags")
    .lean();

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const forum of candidates.slice(0, limit)) {
    try {
      const title = String((forum as { title?: string }).title ?? "").trim();
      const slug = String((forum as { slug?: string }).slug ?? "").trim();
      const content = String((forum as { content?: string }).content ?? "").trim();
      const excerpt = String((forum as { excerpt?: string }).excerpt ?? "").trim();
      const tags = Array.isArray((forum as { tags?: string[] }).tags)
        ? ((forum as { tags?: string[] }).tags ?? []).map(normalizeTag).filter(Boolean).slice(0, 8)
        : [];
      if (!title || !slug || !content) {
        skipped += 1;
        continue;
      }

      const sourceUrl = `forum://${slug}`;
      const existing = await ContentIngestionJobModel.countDocuments({
        source_url: sourceUrl,
        status: { $in: ["pending", "processing", "ready", "published"] },
      });
      if (existing > 0) {
        skipped += 1;
        continue;
      }

      const tutorialTitle = `Tutorial: ${title}`;
      const blogTitle = `From the Forums: ${title}`;
      const baseExcerpt = excerpt || content.slice(0, 260);
      const category = tags[0] ?? "construction";

      await ContentIngestionJobModel.insertMany([
        {
          initiator_identity_key: input.initiatorIdentityKey,
          source_type: "paste",
          source_subtype: "generic_webpage",
          source_url: sourceUrl,
          source_text: content.slice(0, 120_000),
          output_type: "tutorial",
          draft_type: "tutorial",
          publish_target: "tutorials",
          status: "ready",
          ai_title: tutorialTitle.slice(0, 200),
          ai_excerpt: baseExcerpt.slice(0, 500),
          ai_content: buildTutorialDraftContent(tutorialTitle, content).slice(0, 150_000),
          ai_tags: tags,
          ai_category: category.slice(0, 100),
          ai_related_forum_topics: [title.slice(0, 200)],
          processing_started_at: new Date(),
          processing_finished_at: new Date(),
        },
        {
          initiator_identity_key: input.initiatorIdentityKey,
          source_type: "paste",
          source_subtype: "generic_webpage",
          source_url: sourceUrl,
          source_text: content.slice(0, 120_000),
          output_type: "blog",
          draft_type: "blog",
          publish_target: "blog",
          status: "ready",
          ai_title: blogTitle.slice(0, 200),
          ai_excerpt: baseExcerpt.slice(0, 500),
          ai_content: buildBlogDraftContent(blogTitle, content).slice(0, 150_000),
          ai_tags: tags,
          ai_category: category.slice(0, 100),
          ai_related_forum_topics: [title.slice(0, 200)],
          processing_started_at: new Date(),
          processing_finished_at: new Date(),
        },
      ]);
      created += 2;
    } catch {
      failed += 1;
    }
  }

  return { created, skipped, failed };
}

