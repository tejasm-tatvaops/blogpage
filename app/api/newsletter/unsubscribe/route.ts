import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SubscriberModel } from "@/models/Subscriber";
import { createRateLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const unsubLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");

/**
 * GET /api/newsletter/unsubscribe?email=...
 * One-click unsubscribe link included in all outbound emails.
 * Sets active=false (soft delete) and redirects to a confirmation page.
 */
export async function GET(req: NextRequest) {
  const rl = unsubLimiter(getRateLimitKey(req));
  if (!rl.allowed) return rateLimitResponse(rl);

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.redirect(`${SITE_URL}/blog?unsubscribe=invalid`);
  }

  try {
    await connectToDatabase();
    await SubscriberModel.updateOne({ email }, { $set: { active: false } });
  } catch {
    // Non-fatal — still redirect
  }

  return NextResponse.redirect(`${SITE_URL}/blog?unsubscribe=success`);
}

/**
 * POST /api/newsletter/unsubscribe
 * JSON body: { email: string }
 * Returns 200 on success, 400 on invalid email.
 */
export async function POST(req: NextRequest) {
  const rl = unsubLimiter(getRateLimitKey(req));
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email =
    typeof (body as Record<string, unknown>).email === "string"
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
      : "";

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await SubscriberModel.updateOne({ email }, { $set: { active: false } });
    return NextResponse.json({ message: "You have been unsubscribed." }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
