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
  published:  z.boolean().optional(),
  cover_image: z.string().trim().max(500).optional(),
  linked_video_slug: z.string().trim().optional(),
  estimated_minutes: z.number().int().min(1).max(600).optional(),
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
    published:  parsed.data.published,
    coverImage: parsed.data.cover_image,
    linkedVideoSlug: parsed.data.linked_video_slug,
    estimatedMinutes: parsed.data.estimated_minutes,
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
  await deleteTutorial(id);
  return NextResponse.json({ ok: true });
}
