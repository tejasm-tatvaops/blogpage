import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { UserDirectory } from "@/components/users/UserDirectory";
import { getPlatformViewTotals, getUserProfiles } from "@/lib/userProfileService";

export const metadata: Metadata = {
  title: "Users | TatvaOps",
  description: "Community users and readers who have interacted with the TatvaOps blog and forums.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UsersPage() {
  noStore();
  const [users, totals] = await Promise.all([
    getUserProfiles(1000).catch(() => []),
    getPlatformViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })),
  ]);
  return <UserDirectory users={users} totals={totals} />;
}
