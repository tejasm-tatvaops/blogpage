import { NextResponse } from "next/server";
import { getNotificationRecipientKey } from "@/lib/fingerprint";
import { getNotifications } from "@/lib/notificationService";
import { commentLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(request: Request) {
  const rl = commentLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const recipientKey = getNotificationRecipientKey(request);
  const { searchParams } = new URL(request.url);
  const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? "5")));
  const result = await getNotifications(recipientKey, limit);
  return NextResponse.json(result, { status: 200 });
}
