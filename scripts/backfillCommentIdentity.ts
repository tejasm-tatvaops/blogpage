import mongoose from "mongoose";
import { CommentModel } from "@/models/Comment";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const cursor = CommentModel.find({
    $or: [
      { identity_key: { $exists: false } },
      { identity_key: null },
      { identity_key: "" },
    ],
  }).cursor();

  let updated = 0;

  for await (const comment of cursor) {
    if (!comment.author_name) continue;

    const safeSlug = slugify(comment.author_name);
    if (!safeSlug) continue;

    const identityKey = `legacy:${safeSlug}`;

    const result = await CommentModel.updateOne(
      {
        _id: comment._id,
        $or: [
          { identity_key: { $exists: false } },
          { identity_key: null },
          { identity_key: "" },
        ],
      },
      { $set: { identity_key: identityKey } },
    );

    if (result.modifiedCount > 0) updated += 1;
  }

  console.log(`Backfilled ${updated} comments`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
