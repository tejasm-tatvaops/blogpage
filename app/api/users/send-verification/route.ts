import { NextResponse } from "next/server";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { getOwnPrivateProfile } from "@/lib/services/user.service";
import { createVerificationCode, type VerificationType } from "@/lib/services/verification.service";
import { logger } from "@/lib/logger";

type Payload = { type?: VerificationType };

const generateCode = () => `${Math.floor(100000 + Math.random() * 900000)}`;

export async function POST(request: Request) {
  try {
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    if (!identityKey.startsWith("google:")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Payload;
    const type = body.type;
    if (type !== "email" && type !== "phone") {
      return NextResponse.json({ error: "type must be email or phone." }, { status: 400 });
    }

    const profile = await getOwnPrivateProfile(identityKey);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const target = type === "email" ? profile.email : profile.phone;
    if (!target) return NextResponse.json({ error: `${type} is not set on profile.` }, { status: 400 });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await createVerificationCode(identityKey, type, target, code, expiresAt);

    logger.info({ identityKey, type, target, code }, "Verification code generated");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/users/send-verification failed");
    return NextResponse.json({ error: "Failed to send verification code." }, { status: 500 });
  }
}
