import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { createTutorial, getTutorials } from "@/lib/tutorialService";

const createSchema = z.object({
  title:      z.string().trim().min(3).max(200),
  excerpt:    z.string().trim().min(10).max(500),
  content:    z.string().trim().min(50).max(150_000),
  author:     z.string().trim().min(1).max(100),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  content_type: z.enum(["article", "video", "hybrid"]).optional(),
  tags:       z.array(z.string().trim().max(60)).max(10).optional(),
  category:   z.string().trim().min(1).max(100),
  cover_image:z.string().trim().max(500).optional(),
  learning_path_id: z.string().optional(),
  step_number: z.number().int().min(1).optional(),
  linked_video_slug: z.string().trim().optional(),
  linked_blog_slug:  z.string().trim().optional(),
  estimated_minutes: z.number().int().min(1).max(600).optional(),
  published:  z.boolean().optional(),
});

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const page  = Math.max(1, Number(searchParams.get("page")  ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));

  // Admin sees all (including unpublished) — override published filter
  const result = await getTutorials({ page, limit });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const tutorial = await createTutorial({
    title:    parsed.data.title,
    excerpt:  parsed.data.excerpt,
    content:  parsed.data.content,
    author:   parsed.data.author,
    difficulty:   parsed.data.difficulty,
    contentType:  parsed.data.content_type,
    tags:     parsed.data.tags,
    category: parsed.data.category,
    coverImage: parsed.data.cover_image,
    learningPathId: parsed.data.learning_path_id,
    stepNumber:     parsed.data.step_number,
    linkedVideoSlug: parsed.data.linked_video_slug,
    linkedBlogSlug:  parsed.data.linked_blog_slug,
    estimatedMinutes: parsed.data.estimated_minutes,
    published: parsed.data.published,
  });

  return NextResponse.json({ tutorial }, { status: 201 });
}
