import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { generateForumThreads } from "@/lib/forumGenerator";

export const maxDuration = 300;

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { count?: unknown } = {};
  try {
    body = (await request.json()) as { count?: unknown };
  } catch {
    body = {};
  }

  const rawCount = typeof body.count === "number" ? body.count : 5;
  const count = Math.min(Math.max(1, Math.floor(rawCount)), 20);

  try {
    const result = await generateForumThreads(count);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate forums.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
