import { NextResponse } from "next/server";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { getOwnPrivateProfile } from "@/lib/services/user.service";
import { VerificationCodeModel } from "@/models/VerificationCode";
import { UserProfileModel } from "@/models/UserProfile";
import { connectToDatabase } from "@/lib/db/mongodb";
import { logger } from "@/lib/logger";

type VerificationType = "email" | "phone";
type Payload = { type?: VerificationType; code?: string };

export async function POST(request: Request) {
  try {
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    if (!identityKey.startsWith("google:")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Payload;
    const type = body.type;
    const code = String(body.code ?? "").trim();
    if ((type !== "email" && type !== "phone") || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid type/code." }, { status: 400 });
    }

    const profile = await getOwnPrivateProfile(identityKey);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const target = type === "email" ? profile.email : profile.phone;
    if (!target) return NextResponse.json({ error: `${type} is not set on profile.` }, { status: 400 });

    await connectToDatabase();
    const record = await VerificationCodeModel.findOne({
      identity_key: identityKey,
      type,
      target,
    })
      .sort({ created_at: -1 })
      .lean();

    if (!record) return NextResponse.json({ error: "No verification code found." }, { status: 400 });
    if (new Date(record.expires_at).getTime() < Date.now()) {
      await VerificationCodeModel.deleteOne({ _id: record._id });
      return NextResponse.json({ error: "Verification code expired." }, { status: 400 });
    }
    if (Number(record.attempts ?? 0) >= 5) {
      await VerificationCodeModel.deleteOne({ _id: record._id });
      return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
    }
    if (String(record.code ?? "") !== code) {
      const attempts = Number(record.attempts ?? 0) + 1;
      await VerificationCodeModel.updateOne({ _id: record._id }, { $set: { attempts } });
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    await UserProfileModel.updateOne(
      { identity_key: identityKey },
      { $set: type === "email" ? { email_verified: true } : { phone_verified: true } },
    );
    await VerificationCodeModel.deleteOne({ _id: record._id });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/users/verify failed");
    return NextResponse.json({ error: "Failed to verify code." }, { status: 500 });
  }
}
