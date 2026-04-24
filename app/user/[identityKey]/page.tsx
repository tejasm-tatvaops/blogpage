import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { PublicUserProfile } from "@/components/user/UserProfile";
import { getFollowerCount, getFollowingCount } from "@/lib/services/follow.service";
import { getUserProfileByIdentityKey, toPublicUserProfile } from "@/lib/userProfileService";

type UserProfilePageProps = {
  params: Promise<{ identityKey: string }>;
};

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const { identityKey } = await params;
  const decodedIdentity = decodeURIComponent(identityKey);
  return {
    title: `User Profile | ${decodedIdentity} | TatvaOps`,
    description: "Community member profile with reputation and follow stats.",
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  noStore();
  const { identityKey } = await params;
  const decodedIdentity = decodeURIComponent(identityKey).trim();
  if (!decodedIdentity) notFound();

  const user = await getUserProfileByIdentityKey(decodedIdentity);
  if (!user) notFound();
  const publicUser = toPublicUserProfile(user);

  const [followers, following] = await Promise.all([
    getFollowerCount(decodedIdentity),
    getFollowingCount(decodedIdentity),
  ]);

  return (
    <PublicUserProfile
      user={publicUser}
      initialFollowers={followers}
      initialFollowing={following}
    />
  );
}
