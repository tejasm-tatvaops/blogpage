import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { UserDirectory } from "@/components/users/UserDirectory";
import { getPlatformViewTotals, getUserProfileViewTotals, getUserProfiles } from "@/lib/userProfileService";

export const metadata: Metadata = {
  title: "Users | TatvaOps",
  description: "Community users and readers who have interacted with the TatvaOps blog and forums.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UsersPagePayload = {
  users: Awaited<ReturnType<typeof getUserProfiles>>;
  totals: Awaited<ReturnType<typeof getPlatformViewTotals>>;
  userTotals: Awaited<ReturnType<typeof getUserProfileViewTotals>>;
  cachedAt: number;
};

const usersPageState = globalThis as typeof globalThis & {
  __tatvaUsersPageCache?: UsersPagePayload | null;
};
if (!usersPageState.__tatvaUsersPageCache) {
  usersPageState.__tatvaUsersPageCache = null;
}

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> =>
  Promise.race<T>([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);

export default async function UsersPage() {
  noStore();
  const now = Date.now();
  const cached = usersPageState.__tatvaUsersPageCache;
  // Dev-safe micro-cache to avoid repeated heavy recompute during hot reload and rapid navigation.
  if (cached && now - cached.cachedAt < 12_000) {
    return <UserDirectory users={cached.users} totals={cached.totals} userTotals={cached.userTotals} />;
  }

  const userLimit = process.env.NODE_ENV === "development" ? 400 : 1000;
  const [users, totals, userTotals] = await Promise.all([
    withTimeout(getUserProfiles(userLimit).catch(() => []), 3500, []),
    withTimeout(getPlatformViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })), 2000, { blogViews: 0, forumViews: 0 }),
    withTimeout(getUserProfileViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })), 2000, { blogViews: 0, forumViews: 0 }),
  ]);

  usersPageState.__tatvaUsersPageCache = { users, totals, userTotals, cachedAt: now };
  return <UserDirectory users={users} totals={totals} userTotals={userTotals} />;
}
