import { connectToDatabase } from "@/lib/mongodb";
import { TutorialModel } from "@/models/Tutorial";
import { LearningPathModel } from "@/models/LearningPath";
import { TutorialProgressModel } from "@/models/TutorialProgress";
import { onLearningPathCompleted, onTutorialCompleted } from "@/lib/reputationEngine";
import { UserProfileModel } from "@/models/UserProfile";
import { recordMetric } from "@/lib/observability";

function extractStepKeys(content: string): string[] {
  const matches = content.match(/^\s*(?:\d+\.|[-*])\s+.+$/gm) ?? [];
  const unique = Array.from(new Set(matches.map((line) => line.trim().toLowerCase())));
  return unique;
}

function extractInteractiveBlockKeys(
  blocks: unknown,
): string[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((block) => {
      const b = block as Record<string, unknown>;
      const blockId = String(b.block_id ?? "").trim().toLowerCase();
      return blockId ? `block:${blockId}` : null;
    })
    .filter((v): v is string => Boolean(v));
}

export async function getTutorialProgress(identityKey: string, tutorialSlug: string) {
  await connectToDatabase();
  const [tutorial, progress] = await Promise.all([
    TutorialModel.findOne({ slug: tutorialSlug, deleted_at: null }).select("_id slug content learning_path_id interactive_blocks").lean(),
    TutorialProgressModel.findOne({ identity_key: identityKey, tutorial_slug: tutorialSlug }).lean(),
  ]);
  if (!tutorial) return null;
  const stepKeys = extractStepKeys(String(tutorial.content ?? ""));
  const blockKeys = extractInteractiveBlockKeys((tutorial as { interactive_blocks?: unknown[] }).interactive_blocks);
  const allStepKeys = Array.from(new Set([...stepKeys, ...blockKeys]));
  const totalSteps = Math.max(allStepKeys.length, 1);
  const completedSet = new Set(progress?.completed_step_keys ?? []);
  const completedSteps = allStepKeys.filter((key) => completedSet.has(key)).length;
  const completionPercent = progress?.completion_percent ?? Math.round((completedSteps / totalSteps) * 100);
  return {
    tutorialSlug,
    totalSteps,
    completedSteps,
    completionPercent: Math.max(0, Math.min(100, completionPercent)),
    completed: Boolean(progress?.completed),
    completedStepKeys: progress?.completed_step_keys ?? [],
    completedAt: progress?.completed_at ?? null,
    lastActivityAt: progress?.last_activity_at ?? null,
  };
}

export async function markTutorialStepComplete(input: {
  identityKey: string;
  tutorialSlug: string;
  stepKey: string;
}) {
  await connectToDatabase();
  const tutorial = await TutorialModel.findOne({ slug: input.tutorialSlug, deleted_at: null })
    .select("_id slug content learning_path_id interactive_blocks")
    .lean();
  if (!tutorial) return { ok: false as const, reason: "not_found" as const };

  const stepKeys = extractStepKeys(String(tutorial.content ?? ""));
  const blockKeys = extractInteractiveBlockKeys((tutorial as { interactive_blocks?: unknown[] }).interactive_blocks);
  const allStepKeys = Array.from(new Set([...stepKeys, ...blockKeys]));
  const totalSteps = Math.max(allStepKeys.length, 1);
  const normalizedStep = input.stepKey.trim().toLowerCase().slice(0, 200);
  if (!normalizedStep) return { ok: false as const, reason: "invalid_step" as const };

  const progress = await TutorialProgressModel.findOneAndUpdate(
    { identity_key: input.identityKey, tutorial_slug: input.tutorialSlug },
    {
      $setOnInsert: {
        tutorial_id: tutorial._id,
        tutorial_slug: input.tutorialSlug,
        learning_path_id: tutorial.learning_path_id ?? null,
        first_started_at: new Date(),
        total_steps: totalSteps,
      },
      $set: { last_activity_at: new Date(), total_steps: totalSteps },
      $addToSet: { completed_step_keys: normalizedStep },
    },
    { upsert: true, new: true },
  ).lean();

  const completedSet = new Set(progress?.completed_step_keys ?? []);
  const completedSteps = allStepKeys.filter((key) => completedSet.has(key)).length;
  const completionPercent = Math.round((completedSteps / totalSteps) * 100);
  const wasAlreadyCompleted = Boolean(progress?.completed);
  await TutorialProgressModel.updateOne(
    { _id: progress?._id },
    {
      $set: {
        completion_percent: Math.max(0, Math.min(100, completionPercent)),
        completed: completionPercent >= 100,
        completed_at: completionPercent >= 100 ? (progress?.completed_at ?? new Date()) : null,
      },
    },
  );

  if (completionPercent >= 100 && !wasAlreadyCompleted) {
    await onTutorialCompleted(input.identityKey, input.tutorialSlug);
    await UserProfileModel.updateOne(
      { identity_key: input.identityKey },
      { $addToSet: { forum_badges: "learner" } },
    );
  }
  recordMetric("tutorial.block_completion", {
    tutorial_slug: input.tutorialSlug,
    identity_key: input.identityKey,
    completion_percent: completionPercent,
    completed: completionPercent >= 100,
    first_completion: completionPercent >= 100 && !wasAlreadyCompleted,
  });

  return {
    ok: true as const,
    completionPercent: Math.max(0, Math.min(100, completionPercent)),
    completed: completionPercent >= 100,
  };
}

export async function markTutorialCompleted(identityKey: string, tutorialSlug: string) {
  await connectToDatabase();
  const tutorial = await TutorialModel.findOne({ slug: tutorialSlug, deleted_at: null })
    .select("_id slug content learning_path_id")
    .lean();
  if (!tutorial) return { ok: false as const, reason: "not_found" as const };

  const totalSteps = Math.max(extractStepKeys(String(tutorial.content ?? "")).length, 1);
  const existing = await TutorialProgressModel.findOne({
    identity_key: identityKey,
    tutorial_slug: tutorialSlug,
  })
    .select("completed")
    .lean();
  const wasAlreadyCompleted = Boolean(existing?.completed);

  await TutorialProgressModel.updateOne(
    { identity_key: identityKey, tutorial_slug: tutorialSlug },
    {
      $setOnInsert: {
        tutorial_id: tutorial._id,
        tutorial_slug: tutorialSlug,
        learning_path_id: tutorial.learning_path_id ?? null,
        first_started_at: new Date(),
      },
      $set: {
        completed: true,
        completion_percent: 100,
        completed_at: new Date(),
        last_activity_at: new Date(),
        total_steps: totalSteps,
      },
    },
    { upsert: true },
  );

  if (!wasAlreadyCompleted) {
    await onTutorialCompleted(identityKey, tutorialSlug);
    await UserProfileModel.updateOne(
      { identity_key: identityKey },
      { $addToSet: { forum_badges: "learner" } },
    );
  }

  if (tutorial.learning_path_id) {
    const [allInPath, completedInPath] = await Promise.all([
      TutorialModel.countDocuments({
        learning_path_id: tutorial.learning_path_id,
        deleted_at: null,
        published: true,
      }),
      TutorialProgressModel.countDocuments({
        identity_key: identityKey,
        learning_path_id: tutorial.learning_path_id,
        completed: true,
      }),
    ]);
    if (allInPath > 0 && completedInPath >= allInPath && !wasAlreadyCompleted) {
      const path = await LearningPathModel.findById(tutorial.learning_path_id).select("slug").lean();
      if (path?.slug) {
        await onLearningPathCompleted(identityKey, String(path.slug));
        await UserProfileModel.updateOne(
          { identity_key: identityKey },
          { $addToSet: { forum_badges: "mentor" } },
        );
      }
    }
  }
  recordMetric("tutorial.manual_completion", {
    tutorial_slug: tutorialSlug,
    identity_key: identityKey,
    first_completion: !wasAlreadyCompleted,
  });

  return { ok: true as const };
}

export async function getIdentityTutorialProgress(identityKey: string) {
  await connectToDatabase();
  const rows = await TutorialProgressModel.find({ identity_key: identityKey })
    .sort({ updated_at: -1 })
    .limit(200)
    .select("tutorial_slug completion_percent completed completed_at learning_path_id last_activity_at")
    .lean();
  return rows;
}
