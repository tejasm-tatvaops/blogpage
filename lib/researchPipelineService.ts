import { connectToDatabase } from "@/lib/db/mongodb";
import { ContentIngestionJobModel } from "@/models/ContentIngestionJob";

export async function runResearchToTutorialPipeline(identityKey: string, limit = 5) {
  await connectToDatabase();
  const jobs = await ContentIngestionJobModel.find({
    source_subtype: "research_paper",
    status: { $in: ["ready", "published"] },
  })
    .sort({ updated_at: -1 })
    .limit(Math.min(Math.max(1, limit), 20))
    .select("ai_title ai_excerpt ai_content ai_tags ai_category source_url")
    .lean();

  let created = 0;
  for (const job of jobs) {
    const title = String((job as { ai_title?: string }).ai_title ?? "").trim();
    const excerpt = String((job as { ai_excerpt?: string }).ai_excerpt ?? "").trim();
    const content = String((job as { ai_content?: string }).ai_content ?? "").trim();
    const tags = Array.isArray((job as { ai_tags?: string[] }).ai_tags) ? ((job as { ai_tags?: string[] }).ai_tags ?? []) : [];
    const category = String((job as { ai_category?: string }).ai_category ?? "research").trim();
    const sourceUrl = String((job as { source_url?: string }).source_url ?? "").trim();
    if (!title || !content) continue;

    const pipelineKey = `research-pipeline://${encodeURIComponent(sourceUrl || title)}`;
    const exists = await ContentIngestionJobModel.countDocuments({
      source_url: pipelineKey,
      status: { $in: ["pending", "processing", "ready", "published"] },
    });
    if (exists > 0) continue;

    await ContentIngestionJobModel.insertMany([
      {
        initiator_identity_key: identityKey,
        source_type: "research_paper",
        source_subtype: "research_paper",
        source_url: pipelineKey,
        source_text: content,
        output_type: "tutorial",
        draft_type: "tutorial",
        publish_target: "tutorials",
        status: "ready",
        ai_title: `Tutorial: ${title}`.slice(0, 200),
        ai_excerpt: excerpt.slice(0, 500),
        ai_content: content.slice(0, 150000),
        ai_tags: tags,
        ai_category: category.slice(0, 100),
        processing_started_at: new Date(),
        processing_finished_at: new Date(),
      },
      {
        initiator_identity_key: identityKey,
        source_type: "research_paper",
        source_subtype: "research_paper",
        source_url: pipelineKey,
        source_text: content,
        output_type: "short_caption",
        draft_type: "short_caption",
        publish_target: "shorts",
        status: "ready",
        ai_title: `Short Summary: ${title}`.slice(0, 200),
        ai_excerpt: excerpt.slice(0, 500),
        ai_content: content.slice(0, 2000),
        ai_tags: tags,
        ai_category: category.slice(0, 100),
        processing_started_at: new Date(),
        processing_finished_at: new Date(),
      },
      {
        initiator_identity_key: identityKey,
        source_type: "research_paper",
        source_subtype: "research_paper",
        source_url: pipelineKey,
        source_text: content,
        output_type: "forum",
        draft_type: "forum",
        publish_target: "forum",
        status: "ready",
        ai_title: `Discussion: ${title}`.slice(0, 200),
        ai_excerpt: excerpt.slice(0, 500),
        ai_content: `What practical trade-offs do you see while applying: ${title}?\n\n${content.slice(0, 2500)}`,
        ai_tags: tags,
        ai_category: category.slice(0, 100),
        processing_started_at: new Date(),
        processing_finished_at: new Date(),
      },
    ]);
    created += 3;
  }
  return { scanned: jobs.length, created };
}

