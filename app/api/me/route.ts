import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { getNotifications } from "@/lib/services/notification.service";
import { UserProfileModel, getReputationTier } from "@/models/UserProfile";

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> =>
  Promise.race<T>([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);

export async function GET(request: Request) {
  try {
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);

    const [session, reputation, notifications] = await Promise.all([
      getServerSession(authOptions),
      (async () => {
        await connectToDatabase();
        const profile = await UserProfileModel.findOne({ identity_key: identityKey })
          .select("reputation_score reputation_tier")
          .lean();
        const score = Number((profile as { reputation_score?: number } | null)?.reputation_score ?? 0);
        const level = String((profile as { reputation_tier?: string } | null)?.reputation_tier ?? getReputationTier(score));
        return { score, level };
      })(),
      withTimeout(getNotifications(identityKey, 5), 1200, { items: [], unreadCount: 0 }),
    ]);

    return NextResponse.json(
      {
        session: session ?? null,
        reputation,
        notifications,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        session: null,
        reputation: { score: 0, level: "member" },
        notifications: { items: [], unreadCount: 0 },
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

