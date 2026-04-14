import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSession } from "@/lib/session";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const isHtmlNavigation = (request: Request): boolean => {
  const accept = request.headers.get("accept") ?? "";
  const mode = request.headers.get("sec-fetch-mode") ?? "";
  return accept.includes("text/html") || mode === "navigate";
};

const readPassword = async (request: Request): Promise<string> => {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { password?: string };
    return String(body.password ?? "");
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    return String(formData.get("password") ?? "");
  }

  return "";
};

export async function POST(request: Request) {
  const ip = getRateLimitKey(request);
  const rl = adminApiLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const submitted = await readPassword(request);

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
    if (isHtmlNavigation(request)) {
      return NextResponse.redirect(new URL("/admin/blog", request.url), { status: 303 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Login route error");
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
