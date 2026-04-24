import { NextResponse } from "next/server";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { followUser, unfollowUser } from "@/lib/services/follow.service";
import { logger } from "@/lib/logger";

type FollowPayload = {
  targetIdentityKey?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as FollowPayload;
    const targetIdentityKey = String(body.targetIdentityKey ?? "").trim();
    if (!targetIdentityKey) {
      return NextResponse.json({ error: "targetIdentityKey is required." }, { status: 400 });
    }

    const actorIdentityKey = await getIdentityKeyFromSessionOrRequest(request);
    if (!actorIdentityKey || actorIdentityKey === targetIdentityKey) {
      return NextResponse.json({ error: "You cannot follow this user." }, { status: 400 });
    }

    const followers = await followUser(actorIdentityKey, targetIdentityKey);
    return NextResponse.json({ ok: true, followers, isFollowing: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/users/follow failed");
    return NextResponse.json({ error: "Failed to follow user." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as FollowPayload;
    const targetIdentityKey = String(body.targetIdentityKey ?? "").trim();
    if (!targetIdentityKey) {
      return NextResponse.json({ error: "targetIdentityKey is required." }, { status: 400 });
    }

    const actorIdentityKey = await getIdentityKeyFromSessionOrRequest(request);
    if (!actorIdentityKey || actorIdentityKey === targetIdentityKey) {
      return NextResponse.json({ error: "You cannot unfollow this user." }, { status: 400 });
    }

    const followers = await unfollowUser(actorIdentityKey, targetIdentityKey);
    return NextResponse.json({ ok: true, followers, isFollowing: false }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "DELETE /api/users/follow failed");
    return NextResponse.json({ error: "Failed to unfollow user." }, { status: 500 });
  }
}
