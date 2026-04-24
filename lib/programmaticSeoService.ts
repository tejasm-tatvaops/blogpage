import { connectToDatabase } from "@/lib/db/mongodb";
import { ContentIngestionJobModel } from "@/models/ContentIngestionJob";

type SeoTemplateType = "vs" | "what-is" | "best-tools";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ");

function buildTemplate(type: SeoTemplateType, topic: string, compareTo?: string) {
  const cleanTopic = normalize(topic);
  const cleanCompare = normalize(compareTo ?? "");
  if (type === "vs" && cleanCompare) {
    return {
      title: `${cleanTopic} vs ${cleanCompare}: Practical Guide`,
      excerpt: `Compare ${cleanTopic} and ${cleanCompare} with practical trade-offs, use-cases, and implementation notes.`,
      content: `# ${cleanTopic} vs ${cleanCompare}\n\n## Overview\n\n## Key differences\n\n## Use-case fit\n\n## Recommended decision framework`,
      tags: [cleanTopic.toLowerCase(), cleanCompare.toLowerCase(), "comparison"],
      category: "comparison",
    };
  }
  if (type === "best-tools") {
    return {
      title: `Best Tools for ${cleanTopic}`,
      excerpt: `Curated tooling guide for ${cleanTopic} with practical selection criteria and implementation notes.`,
      content: `# Best Tools for ${cleanTopic}\n\n## Selection criteria\n\n## Tool categories\n\n## Rollout checklist`,
      tags: [cleanTopic.toLowerCase(), "tools", "guide"],
      category: "tools",
    };
  }
  return {
    title: `What is ${cleanTopic}?`,
    excerpt: `Simple, practical explanation of ${cleanTopic}, where it applies, and how teams should implement it.`,
    content: `# What is ${cleanTopic}?\n\n## Definition\n\n## Why it matters\n\n## Practical implementation steps`,
    tags: [cleanTopic.toLowerCase(), "basics", "guide"],
    category: "basics",
  };
}

export async function generateSeoTemplateDraft(input: {
  identityKey: string;
  templateType: SeoTemplateType;
  topic: string;
  compareTo?: string;
}) {
  await connectToDatabase();
  const draft = buildTemplate(input.templateType, input.topic, input.compareTo);
  const job = await ContentIngestionJobModel.create({
    initiator_identity_key: input.identityKey,
    source_type: "paste",
    source_subtype: "generic_webpage",
    source_text: draft.content,
    output_type: "blog",
    draft_type: "blog",
    publish_target: "blog",
    status: "ready",
    ai_title: draft.title,
    ai_excerpt: draft.excerpt,
    ai_content: draft.content,
    ai_tags: draft.tags,
    ai_category: draft.category,
    processing_started_at: new Date(),
    processing_finished_at: new Date(),
  });
  return { id: String(job._id), title: draft.title };
}

