import { NextResponse } from "next/server";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { getFollowerCount, getFollowingCount, isFollowing } from "@/lib/services/follow.service";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identityKey: string }> },
) {
  try {
    const { identityKey } = await params;
    const targetIdentityKey = decodeURIComponent(identityKey).trim();
    if (!targetIdentityKey) {
      return NextResponse.json({ followers: 0, following: 0, isFollowing: false }, { status: 200 });
    }

    const [followers, following] = await Promise.all([
      getFollowerCount(targetIdentityKey),
      getFollowingCount(targetIdentityKey),
    ]);

    const viewerIdentityKey = await getIdentityKeyFromSessionOrRequest(request);
    const viewerIsAuthenticated = viewerIdentityKey.startsWith("google:");
    const followingByViewer = viewerIsAuthenticated
      ? await isFollowing(viewerIdentityKey, targetIdentityKey)
      : false;

    return NextResponse.json(
      { followers, following, isFollowing: followingByViewer },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logger.error({ error }, "GET /api/users/[identityKey]/follow-stats failed");
    return NextResponse.json({ followers: 0, following: 0, isFollowing: false }, { status: 200 });
  }
}
