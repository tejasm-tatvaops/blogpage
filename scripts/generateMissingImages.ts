import mongoose from "mongoose";
import { connectToDatabase } from "../lib/mongodb";
import { BlogModel } from "../models/Blog";
import { resolveBlogCoverImage } from "../lib/imageService";

const BATCH_SIZE = 25;
const DELAY_MS = 250;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const run = async (): Promise<void> => {
  await connectToDatabase();

  const missing = await BlogModel.find({
    deleted_at: null,
    $or: [{ cover_image: null }, { cover_image: "" }],
  })
    .select("_id title category tags")
    .lean();

  if (missing.length === 0) {
    console.info("[image-backfill] No posts with missing cover images.");
    await mongoose.connection.close();
    return;
  }

  console.info(`[image-backfill] Found ${missing.length} posts.`);

  let updated = 0;
  let failed = 0;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    for (const post of batch) {
      try {
        const image = await resolveBlogCoverImage({
          title: String(post.title ?? "Construction blog"),
          category: String(post.category ?? "Construction"),
          tags: Array.isArray(post.tags) ? post.tags.map((t) => String(t)) : [],
          existingCoverImage: null,
        });
        if (!image) {
          failed += 1;
          continue;
        }

        await BlogModel.updateOne({ _id: post._id }, { $set: { cover_image: image } });
        updated += 1;
      } catch (error) {
        failed += 1;
        console.error("[image-backfill] Failed for", post._id, error);
      }
      await sleep(DELAY_MS);
    }
  }

  console.info(`[image-backfill] Complete. Updated=${updated}, Failed=${failed}`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("[image-backfill] Fatal:", error);
  await mongoose.connection.close();
  process.exit(1);
});
