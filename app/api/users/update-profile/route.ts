import { NextResponse } from "next/server";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import {
  getOwnPrivateProfile,
  updateUserProfile,
  type UpdateUserProfileInput,
  ProfileValidationError,
  UsernameConflictError,
} from "@/lib/services/user.service";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    if (!identityKey.startsWith("google:")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const profile = await getOwnPrivateProfile(identityKey);
    return NextResponse.json({ profile }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logger.error({ error }, "GET /api/users/update-profile failed");
    return NextResponse.json({ error: "Failed to fetch editable profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    if (!identityKey.startsWith("google:")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateUserProfileInput;
    const updated = await updateUserProfile(identityKey, body);
    return NextResponse.json({ profile: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof UsernameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logger.error({ error }, "PATCH /api/users/update-profile failed");
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
