import { connectToDatabase } from "@/lib/db/mongodb";
import { ensureUserProfileForIdentity } from "@/lib/userProfileService";
import { AuthUserModel } from "@/models/User";
import { UserProfileModel } from "@/models/UserProfile";
import mongoose from "mongoose";

type AuthUserLite = {
  _id: { toString(): string };
  email?: string;
  username?: string;
  name?: string;
};

type UserProfileLite = {
  _id: { toString(): string };
  identity_key?: string;
  display_name?: string;
  last_seen_at?: Date;
  blog_views?: number;
  forum_views?: number;
  blog_comments?: number;
  forum_posts?: number;
  forum_comments?: number;
  forum_votes?: number;
  blog_likes?: number;
};

const APPLY = process.argv.includes("--apply");

const normalize = (value: string | null | undefined): string =>
  String(value ?? "").trim().toLowerCase();

const emailLocal = (email: string): string => normalize(email).split("@")[0] ?? "";

const buildAliases = (user: AuthUserLite): Set<string> => {
  const aliases = new Set<string>();
  const email = normalize(user.email);
  if (email) {
    aliases.add(email);
    aliases.add(emailLocal(email));
  }
  const username = normalize(user.username);
  if (username) aliases.add(username);
  return aliases;
};

async function main() {
  await connectToDatabase();

  const authUsers = (await AuthUserModel.find({})
    .select("_id email username name")
    .lean()) as unknown as AuthUserLite[];

  const authByGoogleKey = new Map<string, AuthUserLite>();
  const aliasToGoogleKeys = new Map<string, Set<string>>();
  for (const user of authUsers) {
    const googleKey = `google:${user._id.toString()}`;
    authByGoogleKey.set(googleKey, user);
    const aliases = buildAliases(user);
    for (const alias of aliases) {
      if (!alias) continue;
      const bucket = aliasToGoogleKeys.get(alias) ?? new Set<string>();
      bucket.add(googleKey);
      aliasToGoogleKeys.set(alias, bucket);
    }
  }

  // Ensure every AuthUser has a profile before attempting migrations.
  for (const [googleKey, user] of authByGoogleKey) {
    if (!APPLY) continue;
    await ensureUserProfileForIdentity({
      identityKey: googleKey,
      displayName: normalize(user.username) || normalize(user.name) || emailLocal(String(user.email ?? "")) || "member",
      avatarSeed: user._id.toString(),
    });
  }

  const profiles = (await UserProfileModel.find({})
    .select("_id identity_key display_name last_seen_at blog_views forum_views blog_comments forum_posts forum_comments forum_votes blog_likes")
    .lean()) as unknown as UserProfileLite[];

  const googleProfiles = new Set(
    profiles
      .map((p) => String(p.identity_key ?? ""))
      .filter((key) => key.startsWith("google:")),
  );

  const sourceProfiles = profiles.filter((profile) => {
    const key = String(profile.identity_key ?? "");
    return key.startsWith("fp:") || key.startsWith("ip:");
  });

  const migrations: Array<{ from: string; to: string; displayName: string }> = [];
  for (const profile of sourceProfiles) {
    const fromKey = String(profile.identity_key ?? "");
    const display = normalize(profile.display_name);
    if (!display) continue;
    const candidateSet = aliasToGoogleKeys.get(display);
    if (!candidateSet || candidateSet.size !== 1) continue;
    const toKey = [...candidateSet][0]!;
    if (!googleProfiles.has(toKey)) continue;
    migrations.push({
      from: fromKey,
      to: toKey,
      displayName: String(profile.display_name ?? ""),
    });
  }

  console.log(`[identity-drift] mode=${APPLY ? "apply" : "dry-run"} authUsers=${authUsers.length} candidates=${migrations.length}`);

  if (!APPLY) {
    for (const migration of migrations.slice(0, 25)) {
      console.log(`[identity-drift] ${migration.from} -> ${migration.to} (${migration.displayName})`);
    }
    if (migrations.length > 25) {
      console.log(`[identity-drift] ...and ${migrations.length - 25} more`);
    }
    return;
  }

  const collectionsToPatch: Array<{ name: string; field: string }> = [
    { name: "comments", field: "identity_key" },
    { name: "reputationevents", field: "identity_key" },
    { name: "bloglikes", field: "identity_key" },
    { name: "feedevents", field: "identity_key" },
    { name: "tutorialprogresses", field: "identity_key" },
    { name: "userpreferences", field: "identity_key" },
    { name: "articlerevisions", field: "proposer_identity_key" },
    { name: "articlerevisions", field: "reviewer_identity_key" },
  ];

  for (const migration of migrations) {
    const source = await UserProfileModel.findOne({ identity_key: migration.from }).lean() as unknown as UserProfileLite | null;
    const target = await UserProfileModel.findOne({ identity_key: migration.to }).lean() as unknown as UserProfileLite | null;
    if (!source || !target) continue;

    await UserProfileModel.updateOne(
      { identity_key: migration.to },
      {
        $inc: {
          blog_views: Number(source.blog_views ?? 0),
          forum_views: Number(source.forum_views ?? 0),
          blog_comments: Number(source.blog_comments ?? 0),
          forum_posts: Number(source.forum_posts ?? 0),
          forum_comments: Number(source.forum_comments ?? 0),
          forum_votes: Number(source.forum_votes ?? 0),
          blog_likes: Number(source.blog_likes ?? 0),
        },
        $max: {
          last_seen_at: source.last_seen_at ?? target.last_seen_at ?? new Date(),
        },
        $set: { user_type: "REAL" },
      },
    );

    for (const patch of collectionsToPatch) {
      await mongoose.connection.collection(patch.name).updateMany(
        { [patch.field]: migration.from },
        { $set: { [patch.field]: migration.to } },
      );
    }

    await UserProfileModel.deleteOne({ identity_key: migration.from });
    console.log(`[identity-drift] migrated ${migration.from} -> ${migration.to}`);
  }

  // Final hard safety: google profiles must always be REAL.
  await UserProfileModel.updateMany(
    { identity_key: { $regex: /^google:/ }, user_type: { $ne: "REAL" } },
    { $set: { user_type: "REAL" } },
  );

  console.log("[identity-drift] complete");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[identity-drift] failed", error);
    process.exit(1);
  });
