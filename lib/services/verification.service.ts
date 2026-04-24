import { VerificationCodeModel } from "@/models/VerificationCode";
import { connectToDatabase } from "@/lib/db/mongodb";

export type VerificationType = "email" | "phone";

export async function createVerificationCode(
  identityKey: string,
  type: VerificationType,
  target: string,
  code: string,
  expiresAt: Date,
) {
  await connectToDatabase();
  await VerificationCodeModel.deleteMany({ identity_key: identityKey, type, target });
  return VerificationCodeModel.create({
    identity_key: identityKey,
    type,
    target,
    code,
    expires_at: expiresAt,
    attempts: 0,
  });
}
