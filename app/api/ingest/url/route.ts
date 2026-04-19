import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { createIngestionJob } from "@/lib/ingestionService";
import { getSystemToggles } from "@/lib/systemToggles";
import type { IngestionOutputType } from "@/models/ContentIngestionJob";

const schema = z.object({
  url:         z.string().url().max(2048),
  output_type: z.enum(["blog", "forum", "short_caption", "tutorial"]).optional(),
});

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  if (!getSystemToggles().ingestionEnabled) {
    return NextResponse.json({ error: "Ingestion is currently disabled." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const job = await createIngestionJob({
    initiatorIdentityKey: "admin:system",
    sourceType: "url",
    sourceUrl:  parsed.data.url,
    outputType: (parsed.data.output_type ?? "blog") as IngestionOutputType,
  });

  return NextResponse.json({ job_id: String(job._id), status: job.status }, { status: 201 });
}
