import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { getIngestionJob, updateIngestionJobDraft } from "@/lib/ingestionService";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const { jobId } = await params;
  const job = await getIngestionJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  return NextResponse.json({ job });
}

const editSchema = z.object({
  title:   z.string().trim().max(200).optional(),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().max(150_000).optional(),
  tags: z.array(z.string().trim().max(60)).max(12).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  learning_path_id: z.string().trim().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const { jobId } = await params;
  await updateIngestionJobDraft(jobId, {
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    content: parsed.data.content,
    tags: parsed.data.tags,
    difficulty: parsed.data.difficulty,
    learningPathId: parsed.data.learning_path_id ?? undefined,
  });
  return NextResponse.json({ ok: true });
}
