import { NextResponse } from "next/server";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import {
  updateUsername,
  UsernameConflictError,
  UsernameValidationError,
} from "@/lib/services/user.service";
import { logger } from "@/lib/logger";

type UsernamePayload = { username?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as UsernamePayload;
    const username = String(body.username ?? "").trim();
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);

    if (!identityKey.startsWith("google:")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const updatedUsername = await updateUsername(identityKey, username);
    return NextResponse.json({ username: updatedUsername }, { status: 200 });
  } catch (error) {
    if (error instanceof UsernameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof UsernameValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logger.error({ error }, "POST /api/users/update-username failed");
    return NextResponse.json({ error: "Failed to update username." }, { status: 500 });
  }
}
