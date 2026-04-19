import { NextResponse } from "next/server";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { getReputationHistory } from "@/lib/reputationEngine";

export async function GET(request: Request) {
  const fp = getFingerprintFromRequest(request);
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  const identityKey = fp ? `fp:${fp}` : `ip:${ip}`;

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")  ?? 50)));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

  try {
    const history = await getReputationHistory(identityKey, limit, offset);
    return NextResponse.json({ history }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch history." }, { status: 500 });
  }
}
