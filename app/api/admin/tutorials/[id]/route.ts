import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { updateTutorial, deleteTutorial } from "@/lib/tutorialService";

const updateSchema = z.object({
  title:      z.string().trim().min(3).max(200).optional(),
  excerpt:    z.string().trim().max(500).optional(),
  content:    z.string().trim().max(150_000).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  tags:       z.array(z.string().trim().max(60)).max(10).optional(),
  category:   z.string().trim().max(100).optional(),
  author:     z.string().trim().max(100).optional(),
  content_type: z.enum(["article", "video", "hybrid"]).optional(),
  learning_path_id: z.string().trim().optional(),
  step_number: z.number().int().min(1).optional().nullable(),
  published:  z.boolean().optional(),
  cover_image: z.string().trim().max(500).optional(),
  linked_video_slug: z.string().trim().optional(),
  linked_blog_slug: z.string().trim().optional(),
  estimated_minutes: z.number().int().min(1).max(600).optional(),
  interactive_blocks: z.array(
    z.object({
      block_id: z.string().trim().min(2).max(60),
      type: z.enum(["quiz", "exercise", "challenge"]),
      title: z.string().trim().min(3).max(200),
      prompt: z.string().trim().min(5).max(4000),
      options: z.array(z.string().trim().min(1).max(240)).max(6).optional(),
      answer_index: z.number().int().min(0).max(5).optional().nullable(),
      explanation: z.string().trim().max(1000).optional().nullable(),
    }),
  ).max(30).optional(),
}).partial();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const { id } = await params;
  const tutorial = await updateTutorial(id, {
    title:      parsed.data.title,
    excerpt:    parsed.data.excerpt,
    content:    parsed.data.content,
    difficulty: parsed.data.difficulty,
    tags:       parsed.data.tags,
    category:   parsed.data.category,
    author:     parsed.data.author,
    contentType: parsed.data.content_type,
    learningPathId: parsed.data.learning_path_id,
    stepNumber: parsed.data.step_number ?? undefined,
    published:  parsed.data.published,
    coverImage: parsed.data.cover_image,
    linkedVideoSlug: parsed.data.linked_video_slug,
    linkedBlogSlug: parsed.data.linked_blog_slug,
    estimatedMinutes: parsed.data.estimated_minutes,
    interactiveBlocks: parsed.data.interactive_blocks?.map((block) => ({
      blockId: block.block_id,
      type: block.type,
      title: block.title,
      prompt: block.prompt,
      options: block.options,
      answerIndex: block.answer_index ?? null,
      explanation: block.explanation ?? null,
    })),
  });

  if (!tutorial) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ tutorial });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const { id } = await params;
  const result = await deleteTutorial(id);
  if (!result.ok) {
    const status = result.reason === "invalid_id" ? 400 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
