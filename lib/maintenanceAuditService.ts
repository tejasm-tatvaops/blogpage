import { connectToDatabase } from "@/lib/db/mongodb";
import { TutorialModel } from "@/models/Tutorial";
import { ContentIngestionJobModel } from "@/models/ContentIngestionJob";

const STALE_DAYS = 180;

export async function runMaintenanceAudit(identityKey: string) {
  await connectToDatabase();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const staleTutorials = await TutorialModel.find({
    deleted_at: null,
    published: true,
    updated_at: { $lt: staleCutoff },
  })
    .sort({ updated_at: 1 })
    .limit(50)
    .select("slug title excerpt content updated_at tags category")
    .lean();

  let drafted = 0;
  for (const tutorial of staleTutorials) {
    const slug = String((tutorial as { slug?: string }).slug ?? "");
    const title = String((tutorial as { title?: string }).title ?? "");
    const excerpt = String((tutorial as { excerpt?: string }).excerpt ?? "");
    const content = String((tutorial as { content?: string }).content ?? "");
    const tags = Array.isArray((tutorial as { tags?: string[] }).tags) ? ((tutorial as { tags?: string[] }).tags ?? []) : [];
    const category = String((tutorial as { category?: string }).category ?? "tutorials");

    const existing = await ContentIngestionJobModel.countDocuments({
      source_url: `maintenance://tutorial/${slug}`,
      status: { $in: ["pending", "processing", "ready"] },
    });
    if (existing > 0) continue;

    await ContentIngestionJobModel.create({
      initiator_identity_key: identityKey,
      source_type: "paste",
      source_subtype: "generic_webpage",
      source_url: `maintenance://tutorial/${slug}`,
      source_text: content,
      output_type: "tutorial",
      draft_type: "tutorial",
      publish_target: "tutorials",
      status: "ready",
      ai_title: `[Refresh] ${title}`.slice(0, 200),
      ai_excerpt: excerpt.slice(0, 500),
      ai_content: content.slice(0, 150000),
      ai_tags: tags,
      ai_category: category,
      ai_summary: "Automated maintenance refresh draft generated for stale tutorial content.",
      processing_started_at: new Date(),
      processing_finished_at: new Date(),
    });
    drafted += 1;
  }

  return { scanned: staleTutorials.length, drafted };
}

