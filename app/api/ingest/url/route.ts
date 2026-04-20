import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { createIngestionJob } from "@/lib/ingestionService";
import { getSystemToggles } from "@/lib/systemToggles";
import type { IngestionOutputType } from "@/models/ContentIngestionJob";

const schema = z.object({
  url:         z.string().url().max(2048),
  output_type: z.enum(["blog", "forum", "short_caption", "tutorial"]),
  source_type: z.enum(["url", "youtube", "github_repo", "research_paper"]).optional(),
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
    sourceType: (parsed.data.source_type ?? "url") as "url" | "youtube" | "github_repo" | "research_paper",
    sourceUrl:  parsed.data.url,
    outputType: parsed.data.output_type as IngestionOutputType,
  });
  const outputType = String(job.output_type ?? parsed.data.output_type) as IngestionOutputType;
  const draftType = String(job.draft_type ?? outputType);
  const publishTarget = String(job.publish_target ?? "blog");
  return NextResponse.json(
    {
      job_id: String(job._id),
      status: job.status,
      output_type: outputType,
      draft_type: draftType,
      publish_target: publishTarget,
      destination_message:
        outputType === "tutorial"
          ? "Tutorial draft created. Review in Tutorial Drafts."
          : outputType === "forum"
            ? "Forum draft created. Review in Forums workflow."
            : "Blog draft created. Review in Blog Drafts.",
    },
    { status: 201 },
  );
}
