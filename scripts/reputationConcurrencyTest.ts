import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  addCommentWithIdentity,
  deleteOwnCommentById,
  decrementPositiveMentionCounter,
  incrementPositiveMentionCounter,
} from "@/lib/services/comment.service";
import { awardPoints, onPositiveFeedback, revertAwardByEventKey } from "@/lib/services/reputation.service";
import { CommentModel } from "@/models/Comment";
import { PositiveMentionCounterModel } from "@/models/PositiveMentionCounter";
import { ReputationEventModel } from "@/models/ReputationEvent";

const PARALLEL = Number(process.env.CONCURRENCY ?? "50");

async function createOne({
  identityKey,
  postId,
  postSlug,
  index,
}: {
  identityKey: string;
  postId: string;
  postSlug: string;
  index: number;
}) {
  const session = await mongoose.startSession();
  try {
    const comment = await session.withTransaction(async () => {
      const created = await addCommentWithIdentity(
        postId,
        {
          author_name: "Concurrency Tester",
          content: `TatvaOps is great for reliability checks ${index} - this is a meaningful positive mention.`,
          is_ai_generated: false,
        },
        identityKey,
        { isPositiveTatvaMention: true, session },
      );
      await awardPoints(
        {
          identityKey,
          reason: "article_comment_received",
          sourceContentSlug: postSlug,
          sourceContentType: "blog",
          eventKey: `blog-comment:${identityKey}:${postSlug}:${created.id}`,
        },
        { session },
      );
      const count = await incrementPositiveMentionCounter(identityKey, postSlug, { session });
      if (count === 1) {
        await onPositiveFeedback(
          identityKey,
          {
            sourceSlug: postSlug,
            eventKey: `positive-feedback:${identityKey}:${postSlug}`,
            note: "Concurrency test positive mention",
          },
          { session },
        );
      }
      return created;
    });
    if (!comment) throw new Error("Create transaction returned null");
    return comment.id;
  } finally {
    await session.endSession();
  }
}

async function deleteOne({
  identityKey,
  postSlug,
  commentId,
}: {
  identityKey: string;
  postSlug: string;
  commentId: string;
}) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const deleted = await deleteOwnCommentById(commentId, identityKey, { session });
      if (deleted.status !== "deleted") return;
      await revertAwardByEventKey(identityKey, `blog-comment:${identityKey}:${postSlug}:${commentId}`, { session });
      if (deleted.deleted.is_positive_tatva_mention) {
        const remaining = await decrementPositiveMentionCounter(identityKey, postSlug, { session });
        if (remaining === 0) {
          await revertAwardByEventKey(identityKey, `positive-feedback:${identityKey}:${postSlug}`, { session });
        }
      }
    });
  } finally {
    await session.endSession();
  }
}

async function main() {
  await connectToDatabase();
  const runId = `rep-concurrency-${Date.now()}`;
  const identityKey = `google:rep-concurrency:${runId}`;
  const postSlug = runId;
  const postId = new mongoose.Types.ObjectId().toHexString();

  await Promise.all([
    CommentModel.deleteMany({ identity_key: identityKey }),
    ReputationEventModel.deleteMany({
      identity_key: identityKey,
      $or: [
        { event_key: { $regex: `^blog-comment:${identityKey}:${postSlug}:` } },
        { event_key: `positive-feedback:${identityKey}:${postSlug}` },
        { event_key: `revert:positive-feedback:${identityKey}:${postSlug}` },
      ],
    }),
    PositiveMentionCounterModel.deleteMany({ identity_key: identityKey, post_slug: postSlug }),
  ]);

  const createdCommentIds = await Promise.all(
    Array.from({ length: PARALLEL }, (_, i) => createOne({ identityKey, postId, postSlug, index: i })),
  );

  const positiveAwardCount = await ReputationEventModel.countDocuments({
    identity_key: identityKey,
    event_key: `positive-feedback:${identityKey}:${postSlug}`,
  });
  if (positiveAwardCount > 1) {
    throw new Error(`Expected at most 1 positive-feedback award, got ${positiveAwardCount}`);
  }

  await Promise.all(createdCommentIds.map((commentId) => deleteOne({ identityKey, postSlug, commentId })));

  const counterDoc = await PositiveMentionCounterModel.findOne({
    identity_key: identityKey,
    post_slug: postSlug,
  })
    .select("qualifying_count")
    .lean();
  const counterValue = Number(counterDoc?.qualifying_count ?? 0);
  if (counterValue !== 0) {
    throw new Error(`Expected qualifying_count=0 after deletes, got ${counterValue}`);
  }

  const positiveReversalCount = await ReputationEventModel.countDocuments({
    identity_key: identityKey,
    event_key: `revert:positive-feedback:${identityKey}:${postSlug}`,
  });
  if (positiveReversalCount > 1) {
    throw new Error(`Expected at most 1 positive-feedback reversal, got ${positiveReversalCount}`);
  }
  if (positiveAwardCount === 1 && positiveReversalCount !== 1) {
    throw new Error(`Expected one positive-feedback reversal when bonus exists, got ${positiveReversalCount}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        parallelCreates: PARALLEL,
        positiveAwardCount,
        positiveReversalCount,
        counterValue,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
