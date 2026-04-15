import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SubscriberModel } from "@/models/Subscriber";
import { createRateLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const newsletterLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

export async function POST(req: NextRequest) {
  const result = newsletterLimiter(getRateLimitKey(req));
  if (!result.allowed) return rateLimitResponse(result);

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

    // Use upsert to avoid the findOne→create TOCTOU race condition.
    // $setOnInsert only fires when a new document is created; $set always fires.
    const result = await SubscriberModel.updateOne(
      { email },
      { $set: { active: true }, $setOnInsert: { email } },
      { upsert: true },
    );

    const isNew = result.upsertedCount > 0;
    return NextResponse.json(
      { message: isNew ? "Subscribed! You'll hear from us soon." : "You're already subscribed!" },
      { status: isNew ? 201 : 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
