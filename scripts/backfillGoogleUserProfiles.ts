import mongoose from "mongoose";
import dotenv from "dotenv";
import { AuthUserModel } from "@/models/User";
import { UserProfileModel } from "@/models/UserProfile";
import { getAvatarForIdentity } from "@/lib/avatar";

dotenv.config({ path: ".env.local" });

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(mongoUri);

  const users = await AuthUserModel.find({})
    .select("_id username name image")
    .lean();

  console.log("Found users:", users.length);

  let created = 0;
  let existing = 0;

  for (const user of users) {
    const userId = String(user._id);
    const identityKey = `google:${userId}`;

    const exists = await UserProfileModel.findOne({ identity_key: identityKey })
      .select("_id")
      .lean();

    if (exists) {
      existing += 1;
      console.log("Already exists:", identityKey);
      continue;
    }

    const displayName = (
      (typeof (user as { username?: string }).username === "string" && (user as { username?: string }).username) ||
      (typeof (user as { name?: string }).name === "string" && (user as { name?: string }).name) ||
      "Member"
    ).trim();

    const avatarFromAuth = typeof (user as { image?: string | null }).image === "string"
      ? (user as { image?: string }).image?.trim()
      : "";

    await UserProfileModel.create({
      identity_key: identityKey,
      display_name: displayName || "Member",
      about: "Member profile synchronized from authenticated session and platform activity.",
      avatar_url: avatarFromAuth || getAvatarForIdentity(identityKey),
      user_type: "REAL",
      reputation_score: 0,
      reputation_tier: "member",
      interest_tags: {},
      blog_likes: 0,
      last_seen_at: new Date(),
    });

    created += 1;
    console.log("Created:", identityKey);
  }

  console.log("Done");
  console.log("Created:", created);
  console.log("Already existed:", existing);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
