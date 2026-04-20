import "dotenv/config";
import { connectToDatabase } from "@/lib/mongodb";
import { TutorialModel } from "@/models/Tutorial";
import { LearningPathModel } from "@/models/LearningPath";
import { TutorialProgressModel } from "@/models/TutorialProgress";
import { ContentIngestionJobModel } from "@/models/ContentIngestionJob";
import { ReputationEventModel } from "@/models/ReputationEvent";

const SMOKE_TITLE = /^(delete smoke|smoke test|smoke tutorial)/i;
const SMOKE_SLUG = /^(delete-smoke|smoke-test|smoke-tutorial)/i;

async function run() {
  await connectToDatabase();

  const tutorials = await TutorialModel.find({
    $or: [
      { is_test_data: true },
      { title: { $regex: SMOKE_TITLE } },
      { slug: { $regex: SMOKE_SLUG } },
      { author: { $regex: /smoke bot/i } },
    ],
  }).select("_id slug").lean();
  const tutorialIds = tutorials.map((t) => t._id);
  const tutorialSlugs = tutorials.map((t) => String(t.slug));

  const [deletedTutorials, deletedProgress, cleanedPaths, removedPaths, clearedIngestionRefs, deletedIngestionSmoke, clearedRepLinks] =
    await Promise.all([
      TutorialModel.updateMany(
        { _id: { $in: tutorialIds } },
        { $set: { deleted_at: new Date(), published: false, is_test_data: true } },
      ),
      TutorialProgressModel.deleteMany({
        $or: [
          { tutorial_id: { $in: tutorialIds } },
          { tutorial_slug: { $in: tutorialSlugs } },
          { identity_key: { $regex: /^fp:smoke-/i } },
        ],
      }),
      LearningPathModel.updateMany(
        { tutorial_ids: { $in: tutorialIds } },
        { $pull: { tutorial_ids: { $in: tutorialIds } } },
      ),
      LearningPathModel.deleteMany({
        $or: [
          { is_test_data: true },
          { title: { $regex: /delete smoke path|smoke path/i } },
          { slug: { $regex: /delete-smoke-path|smoke-path/i } },
        ],
      }),
      ContentIngestionJobModel.updateMany(
        { published_content_type: "tutorial", published_slug: { $in: tutorialSlugs } },
        { $set: { published_slug: null, published_content_type: "tutorial_deleted" } },
      ),
      ContentIngestionJobModel.deleteMany({
        $or: [{ initiator_identity_key: "smoke:test" }, { source_text: { $regex: /smoke-test/i } }],
      }),
      ReputationEventModel.updateMany(
        { source_content_type: "tutorial", source_content_slug: { $in: tutorialSlugs } },
        { $set: { source_content_slug: null } },
      ),
    ]);

  console.log(
    JSON.stringify(
      {
        matchedTutorials: tutorials.length,
        tutorialsSoftDeleted: deletedTutorials.modifiedCount ?? 0,
        progressDeleted: deletedProgress.deletedCount ?? 0,
        learningPathsUnlinked: cleanedPaths.modifiedCount ?? 0,
        learningPathsDeleted: removedPaths.deletedCount ?? 0,
        ingestionRefsCleared: clearedIngestionRefs.modifiedCount ?? 0,
        smokeIngestionRowsDeleted: deletedIngestionSmoke.deletedCount ?? 0,
        reputationLinksCleared: clearedRepLinks.modifiedCount ?? 0,
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
