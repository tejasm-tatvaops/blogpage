import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { sendNewsletterDigest } from "@/lib/newsletterDigest";

export async function POST(req: NextRequest) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = adminApiLimiter(getRateLimitKey(req));
  if (!rl.allowed) return rateLimitResponse(rl);

  let intro = "";
  try {
    const body = (await req.json()) as { intro?: unknown };
    intro = String(body.intro ?? "").trim();
  } catch {
    // Keep default intro when no/invalid payload is sent.
  }

  try {
    const result = await sendNewsletterDigest({ intro: intro || undefined });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send digest." },
      { status: 500 },
    );
  }
}
