import "dotenv/config";
import { connectToDatabase } from "@/lib/db/mongodb";
import { createTutorial, deleteTutorial } from "@/lib/tutorialService";
import { TutorialModel } from "@/models/Tutorial";
import { TutorialProgressModel } from "@/models/TutorialProgress";
import { LearningPathModel } from "@/models/LearningPath";
import { ContentIngestionJobModel } from "@/models/ContentIngestionJob";
import { ReputationEventModel } from "@/models/ReputationEvent";

async function run() {
  await connectToDatabase();

  const tutorial = await createTutorial({
    title: `Delete Smoke Tutorial ${Date.now()}`,
    excerpt: "Smoke test tutorial deletion cleanup.",
    content: "Step 1 do this.\nStep 2 do that.\nStep 3 verify cleanup.",
    author: "Smoke Bot",
    category: "Testing",
    tags: ["smoke", "delete"],
    published: true,
    isTestData: true,
  });

  const tutorialId = String((tutorial as any)._id);
  const tutorialSlug = String((tutorial as any).slug);

  const path = await LearningPathModel.create({
    title: `Delete Smoke Path ${Date.now()}`,
    slug: `delete-smoke-path-${Date.now()}`,
    description: "Path for delete cleanup smoke test",
    published: true,
    is_test_data: true,
    tutorial_ids: [(tutorial as any)._id],
  });

  await TutorialProgressModel.create({
    identity_key: "fp:smoke-delete",
    tutorial_id: (tutorial as any)._id,
    tutorial_slug: tutorialSlug,
    learning_path_id: (path as any)._id,
    completed_step_keys: ["step-1"],
    total_steps: 3,
    completion_percent: 33,
  });

  await ContentIngestionJobModel.create({
    initiator_identity_key: "smoke:test",
    source_type: "paste",
    source_text: "smoke",
    output_type: "tutorial",
    draft_type: "tutorial",
    publish_target: "tutorials",
    status: "published",
    published_slug: tutorialSlug,
    published_content_type: "tutorial",
  });

  await ReputationEventModel.create({
    identity_key: "fp:smoke-delete",
    reason: "tutorial_completed",
    base_points: 12,
    multiplier: 1,
    awarded_points: 12,
    running_total: 12,
    source_content_type: "tutorial",
    source_content_slug: tutorialSlug,
    note: "smoke",
    is_cross_content: false,
  });

  const del = await deleteTutorial(tutorialId);
  if (!del.ok) throw new Error(`Delete failed: ${del.reason}`);

  const [deletedTutorial, progressCount, pathAfter, ingestAfter, repAfter] = await Promise.all([
    TutorialModel.findById(tutorialId).select("deleted_at published").lean(),
    TutorialProgressModel.countDocuments({ tutorial_slug: tutorialSlug }),
    LearningPathModel.findById((path as any)._id).select("tutorial_ids").lean(),
    ContentIngestionJobModel.findOne({ published_slug: null, published_content_type: "tutorial_deleted" }).lean(),
    ReputationEventModel.findOne({ reason: "tutorial_completed", note: "smoke" }).select("source_content_slug").lean(),
  ]);

  // Cleanup all smoke fixtures created by this script.
  await Promise.all([
    LearningPathModel.deleteOne({ _id: (path as any)._id }),
    ContentIngestionJobModel.deleteMany({ initiator_identity_key: "smoke:test" }),
    ReputationEventModel.deleteMany({ note: "smoke", identity_key: "fp:smoke-delete" }),
  ]);

  console.log(
    JSON.stringify(
      {
        tutorialSoftDeleted: Boolean(deletedTutorial?.deleted_at),
        tutorialPublishedFlag: deletedTutorial?.published ?? null,
        progressRowsRemaining: progressCount,
        pathStillContainsTutorial: Boolean(pathAfter?.tutorial_ids?.some((id: any) => String(id) === tutorialId)),
        ingestionReferenceCleared: Boolean(ingestAfter),
        reputationSlugCleared: repAfter?.source_content_slug === null,
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
