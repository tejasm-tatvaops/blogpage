import "dotenv/config";
import { createIngestionJob, getIngestionJob, markIngestionJobPublished } from "@/lib/ingestionService";
import { createTutorial, getTutorialBySlug, getTutorials } from "@/lib/tutorialService";
import type { IngestionOutputType } from "@/models/ContentIngestionJob";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForReady(jobId: string, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await getIngestionJob(jobId);
    const status = String(job?.status ?? "");
    if (status === "ready") return job;
    if (status === "failed") {
      throw new Error(`Ingestion job failed: ${String(job?.error_message ?? "unknown")}`);
    }
    await sleep(2_000);
  }
  throw new Error("Timed out waiting for tutorial job to become ready.");
}

async function run() {
  const outputType: IngestionOutputType = "tutorial";
  const job = await createIngestionJob({
    initiatorIdentityKey: "smoke:test",
    sourceType: "paste",
    outputType,
    sourceText:
      "This is a smoke-test source on BOQ workflows. Step 1 gather material rates. Step 2 normalize unit costs. Step 3 build trade-wise quantities. Step 4 validate contingency assumptions. Include practical examples for site execution and procurement planning.",
  });

  const jobId = String(job._id);
  const ready = await waitForReady(jobId);

  const readyRecord = {
    output_type: ready?.output_type,
    draft_type: (ready as Record<string, unknown>)?.draft_type,
    publish_target: (ready as Record<string, unknown>)?.publish_target,
    status: ready?.status,
  };

  const title = String((ready as Record<string, unknown>)?.edited_title ?? ready?.ai_title ?? "Untitled");
  const excerpt = String((ready as Record<string, unknown>)?.edited_excerpt ?? ready?.ai_excerpt ?? "");
  const content = String((ready as Record<string, unknown>)?.edited_content ?? ready?.ai_content ?? "");
  const tags = (((ready as Record<string, unknown>)?.edited_tags as string[] | undefined)?.length
    ? ((ready as Record<string, unknown>)?.edited_tags as string[])
    : ((ready?.ai_tags as string[] | undefined) ?? []));
  const category = String(ready?.ai_category ?? "General");
  const difficulty = (((ready as Record<string, unknown>)?.edited_difficulty as "beginner" | "intermediate" | "advanced" | undefined) ?? "beginner");
  const learningPathId = (((ready as Record<string, unknown>)?.edited_learning_path_id as string | null | undefined) ?? null);

  const tutorial = await createTutorial({
    title,
    excerpt: excerpt || "Smoke test tutorial excerpt",
    content,
    author: "TatvaOps AI",
    difficulty,
    contentType: "article",
    tags,
    category,
    learningPathId,
    published: true,
  });
  const slug = String((tutorial as Record<string, unknown>).slug);
  await markIngestionJobPublished(jobId, slug, "tutorial");

  const publishedJob = await getIngestionJob(jobId);
  const publishedStatus = String(publishedJob?.status ?? "");
  const adminList = await getTutorials({ includeUnpublished: true, limit: 200 });
  const publicList = await getTutorials({ limit: 200 });
  const detail = await getTutorialBySlug(slug);

  const inAdmin = adminList.tutorials.some((row) => String((row as Record<string, unknown>).slug) === slug);
  const inPublic = publicList.tutorials.some((row) => String((row as Record<string, unknown>).slug) === slug);
  const inDetail = Boolean(detail);

  console.log(
    JSON.stringify(
      {
        readyRecord,
        publishRecord: {
          status: publishedStatus,
          published_content_type: publishedJob?.published_content_type ?? null,
          published_slug: publishedJob?.published_slug ?? null,
        },
        visibility: {
          adminTutorials: inAdmin,
          publicTutorials: inPublic,
          tutorialDetail: inDetail,
          slug,
        },
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
