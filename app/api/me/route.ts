import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getNotifications } from "@/lib/services/notification.service";
import { UserProfileModel, getReputationTier } from "@/models/UserProfile";

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> =>
  Promise.race<T>([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);

const DEFAULT_REPUTATION = { score: 0, level: "member" };
const DEFAULT_NOTIFICATIONS = { items: [] as never[], unreadCount: 0 };

async function loadReputation(identityKey: string) {
  await connectToDatabase();
  const profile = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("reputation_score reputation_tier")
    .lean();
  const score = Number((profile as { reputation_score?: number } | null)?.reputation_score ?? 0);
  const level = String(
    (profile as { reputation_tier?: string } | null)?.reputation_tier ?? getReputationTier(score),
  );
  return { score, level };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          session: session ?? null,
          reputation: DEFAULT_REPUTATION,
          notifications: DEFAULT_NOTIFICATIONS,
        },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const identityKey = `google:${session.user.id.trim()}`;

    const [reputation, notifications] = await Promise.all([
      withTimeout(loadReputation(identityKey), 2500, DEFAULT_REPUTATION),
      withTimeout(getNotifications(identityKey, 5), 1200, DEFAULT_NOTIFICATIONS),
    ]);

    return NextResponse.json(
      {
        session,
        reputation,
        notifications,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        session: null,
        reputation: DEFAULT_REPUTATION,
        notifications: DEFAULT_NOTIFICATIONS,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
