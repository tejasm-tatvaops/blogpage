import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSession } from "@/lib/session";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const ip = getRateLimitKey(request);
  if (!adminApiLimiter(ip)) {
    return rateLimitResponse();
  }

  try {
    const body = (await request.json()) as { password?: string };
    const submitted = String(body.password ?? "");

    const secret = process.env.ADMIN_BLOG_SECRET ?? "";
    const enabled = process.env.ADMIN_BLOG_ENABLED === "true";

    if (!enabled || !secret) {
      return NextResponse.json({ error: "Admin access is disabled." }, { status: 403 });
    }

    const match =
      submitted.length === secret.length &&
      timingSafeEqual(Buffer.from(submitted), Buffer.from(secret));

    if (!match) {
      logger.warn({ ip }, "Failed admin login attempt");
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const session = await getSession();
    session.adminAuthenticated = true;
    await session.save();

    logger.info({ ip }, "Admin login successful");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Login route error");
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
