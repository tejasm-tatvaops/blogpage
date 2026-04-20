import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { connectToDatabase } from "@/lib/mongodb";
import { SubscriberModel } from "@/models/Subscriber";
import { createRateLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { buildConfirmationEmail } from "@/channels/emailChannel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const newsletterLimiter: ReturnType<typeof createRateLimiter> =
  createRateLimiter({ limit: 5, windowMs: 60_000 });

const sendConfirmationEmail = async (email: string): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const resend = new Resend(apiKey);
  const from = process.env.NEWSLETTER_FROM ?? "TatvaOps Blog <onboarding@resend.dev>";
  const { subject, html } = buildConfirmationEmail(email);
  const { error } = await resend.emails.send({ from, to: email, subject, html });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
};

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

    try {
      // Always send (or re-send) confirmation for both new and existing subscribers.
      await sendConfirmationEmail(email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown email delivery error";
      console.error("newsletter.subscribe email delivery failed", { email, isNew, error: errorMessage });

      return NextResponse.json(
        {
          error:
            "Subscription saved, but we could not send the confirmation email right now. Please try again shortly.",
          subscription_saved: true,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        message: isNew
          ? "Subscribed! Check your inbox for a confirmation."
          : "You're already subscribed. We re-sent your confirmation email.",
      },
      { status: isNew ? 201 : 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown newsletter subscribe error";
    console.error("newsletter.subscribe failed", { email, error: errorMessage });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
