import { NextResponse } from "next/server";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { getFollowerCount, getFollowingCount, isFollowing } from "@/lib/services/follow.service";
import { logger } from "@/lib/logger";

type BatchPayload = {
  identityKeys?: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as BatchPayload;
    const keys = Array.isArray(body.identityKeys)
      ? [...new Set(body.identityKeys.map((key) => String(key ?? "").trim()).filter(Boolean))].slice(0, 100)
      : [];
    if (keys.length === 0) {
      return NextResponse.json({ stats: {} }, { status: 200 });
    }

    const viewerIdentityKey = await getIdentityKeyFromSessionOrRequest(request);
    const viewerIsAuthenticated = viewerIdentityKey.startsWith("google:");

    const results = await Promise.all(
      keys.map(async (targetIdentityKey) => {
        const [followers, following, followingByViewer] = await Promise.all([
          getFollowerCount(targetIdentityKey),
          getFollowingCount(targetIdentityKey),
          viewerIsAuthenticated ? isFollowing(viewerIdentityKey, targetIdentityKey) : Promise.resolve(false),
        ]);
        return [targetIdentityKey, { followers, following, isFollowing: followingByViewer }] as const;
      }),
    );

    return NextResponse.json(
      { stats: Object.fromEntries(results) },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logger.error({ error }, "POST /api/users/follow-stats/batch failed");
    return NextResponse.json({ stats: {} }, { status: 200 });
  }
}
