import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { UserDirectory } from "@/components/users/UserDirectory";
import { requireAdminPageAccess } from "@/lib/adminAuth";
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
  await requireAdminPageAccess();
  noStore();
  const now = Date.now();
  const cached = usersPageState.__tatvaUsersPageCache;
  // Dev-safe micro-cache to avoid repeated heavy recompute during hot reload and rapid navigation.
  // Never serve cached empty result; it causes a false "no users" state flicker.
  if (cached && cached.users.length > 0 && now - cached.cachedAt < 12_000) {
    return <UserDirectory users={cached.users} totals={cached.totals} userTotals={cached.userTotals} />;
  }

  // Keep a full slice in dev so "real photos only" can surface mixed-avatar profiles.
  const userLimit = 1000;
  let [users, totals, userTotals] = await Promise.all([
    withTimeout(getUserProfiles(userLimit).catch(() => []), 3500, []),
    withTimeout(getPlatformViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })), 2000, { blogViews: 0, forumViews: 0 }),
    withTimeout(getUserProfileViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })), 2000, { blogViews: 0, forumViews: 0 }),
  ]);
  console.log("users fetched:", users.length);

  // One immediate retry helps avoid first-hit race/timeout cold-start empties.
  if (users.length === 0) {
    [users, totals, userTotals] = await Promise.all([
      withTimeout(getUserProfiles(userLimit).catch(() => []), 5000, []),
      withTimeout(getPlatformViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })), 2500, { blogViews: 0, forumViews: 0 }),
      withTimeout(getUserProfileViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })), 2500, { blogViews: 0, forumViews: 0 }),
    ]);
    console.log("users fetched after retry:", users.length);
  }

  if (users.length > 0) {
    usersPageState.__tatvaUsersPageCache = { users, totals, userTotals, cachedAt: now };
  }
  return <UserDirectory users={users} totals={totals} userTotals={userTotals} />;
}
