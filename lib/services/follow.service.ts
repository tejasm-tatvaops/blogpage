import { connectToDatabase } from "@/lib/db/mongodb";
import { UserFollowModel } from "@/models/UserFollow";

const cleanKey = (value: string) => value.trim().slice(0, 200);

export async function followUser(followerKey: string, targetKey: string): Promise<number> {
  await connectToDatabase();
  const follower = cleanKey(followerKey);
  const target = cleanKey(targetKey);
  if (!follower || !target || follower === target) {
    throw new Error("Invalid follow request.");
  }

  await UserFollowModel.updateOne(
    {
      follower_identity_key: follower,
      following_identity_key: target,
    },
    {
      $setOnInsert: {
        follower_identity_key: follower,
        following_identity_key: target,
      },
    },
    { upsert: true },
  );

  return getFollowerCount(target);
}

export async function unfollowUser(followerKey: string, targetKey: string): Promise<number> {
  await connectToDatabase();
  const follower = cleanKey(followerKey);
  const target = cleanKey(targetKey);
  if (!follower || !target || follower === target) return getFollowerCount(target);

  await UserFollowModel.deleteOne({
    follower_identity_key: follower,
    following_identity_key: target,
  });

  return getFollowerCount(target);
}

export async function getFollowerCount(identityKey: string): Promise<number> {
  await connectToDatabase();
  const key = cleanKey(identityKey);
  if (!key) return 0;
  return UserFollowModel.countDocuments({ following_identity_key: key });
}

export async function getFollowingCount(identityKey: string): Promise<number> {
  await connectToDatabase();
  const key = cleanKey(identityKey);
  if (!key) return 0;
  return UserFollowModel.countDocuments({ follower_identity_key: key });
}

export async function isFollowing(followerKey: string, targetKey: string): Promise<boolean> {
  await connectToDatabase();
  const follower = cleanKey(followerKey);
  const target = cleanKey(targetKey);
  if (!follower || !target || follower === target) return false;
  const result = await UserFollowModel.findOne({
    follower_identity_key: follower,
    following_identity_key: target,
  })
    .select("_id")
    .lean();
  return Boolean(result?._id);
}
