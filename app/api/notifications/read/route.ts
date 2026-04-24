import { NextResponse } from "next/server";
import { z } from "zod";
import { markAsRead } from "@/lib/notificationService";
import { commentLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

const payloadSchema = z.object({
  ids: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const rl = commentLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = (await request.json()) as unknown;
  } catch {
    body = {};
  }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const recipientKey = await getIdentityKeyFromSessionOrRequest(request);
  await markAsRead(recipientKey, parsed.data.ids);
  return NextResponse.json({ success: true }, { status: 200 });
}
