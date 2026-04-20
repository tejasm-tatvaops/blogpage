import { NextResponse } from "next/server";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { getIdentityTutorialProgress } from "@/lib/tutorialProgressService";

function identityFromRequest(request: Request): string {
  const fp = getFingerprintFromRequest(request);
  if (fp) return `fp:${fp}`;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  return `ip:${ip}`;
}

export async function GET(request: Request) {
  const identityKey = identityFromRequest(request);
  const progress = await getIdentityTutorialProgress(identityKey);
  return NextResponse.json({ progress });
}
