import { NextResponse } from "next/server";
import { getNotifications } from "@/lib/notificationService";
import { commentLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/requestIdentity";

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> =>
  Promise.race<T>([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);

export async function GET(request: Request) {
  const rl = commentLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const recipientKey = await getIdentityKeyFromSessionOrRequest(request);
  const { searchParams } = new URL(request.url);
  const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? "5")));
  const result = await withTimeout(
    getNotifications(recipientKey, limit),
    1200,
    { items: [], unreadCount: 0 },
  );
  return NextResponse.json(result, { status: 200 });
}
