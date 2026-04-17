import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { connectToDatabase } from "@/lib/mongodb";
import { SubscriberModel } from "@/models/Subscriber";
import { createRateLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { buildConfirmationEmail } from "@/channels/emailChannel";

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

    const upsertResult = await SubscriberModel.updateOne(
      { email },
      { $set: { active: true }, $setOnInsert: { email } },
      { upsert: true },
    );

    const isNew = upsertResult.upsertedCount > 0;

    // Send confirmation email only for new subscribers
    if (isNew) {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = new Resend(apiKey);
        const from = process.env.NEWSLETTER_FROM ?? "TatvaOps Blog <onboarding@resend.dev>";
        const { subject, html } = buildConfirmationEmail(email);
        // Fire-and-forget — don't block the response on email delivery
        resend.emails.send({ from, to: email, subject, html }).catch(() => {
          // Confirmation email failure is non-fatal
        });
      }
    }

    return NextResponse.json(
      { message: isNew ? "Subscribed! Check your inbox for a confirmation." : "You're already subscribed!" },
      { status: isNew ? 201 : 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
