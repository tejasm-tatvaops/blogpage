import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { errorResponse } from "@/lib/adminApi";
import { logger } from "@/lib/logger";
import {
  getVideoPosts,
  createVideoPost,
  deriveYouTubeQuerySuggestions,
  type VideoPostWriteInput,
} from "@/lib/videoService";
import { z } from "zod";

// ─── Validation schema ────────────────────────────────────────────────────────

const videoWriteSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(300),
  slug: z.string().optional().or(z.literal("")),
  sourceType: z.enum(["youtube", "uploaded", "curated"]),
  youtubeVideoId: z.string().nullable().optional(),
  videoUrl: z.string().url("videoUrl must be a valid URL").nullable().optional(),
  thumbnailUrl: z.string().url("thumbnailUrl must be a valid URL").nullable().optional(),
  animatedPreviewUrl: z.string().url().nullable().optional(),
  durationSeconds: z.number().min(1).max(3600).nullable().optional(),
  shortCaption: z.string().min(5, "Caption must be at least 5 characters").max(400),
  transcript: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  tags: z.array(z.string().max(50).trim()).max(20).default([]),
  category: z.string().min(1, "Category is required").max(100).trim(),
  linkedBlogSlug: z.string().nullable().optional(),
  linkedForumSlug: z.string().nullable().optional(),
  published: z.boolean().default(false),
}).refine((data) => {
  if (data.sourceType === "youtube") return !!data.youtubeVideoId;
  return !!data.videoUrl;
}, {
  message: "youtube sourceType requires a youtubeVideoId; uploaded/curated requires a videoUrl",
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));

    const result = await getVideoPosts({ sort: "new", page, limit, includeUnpublished: true });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error({ error }, "GET /api/admin/videos error");
    return NextResponse.json({ error: "Failed to fetch videos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const result = videoWriteSchema.safeParse(body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? "Invalid input.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const input = result.data as VideoPostWriteInput;
    const post = await createVideoPost(input);
    logger.info({ slug: post.slug }, "Admin created video post");
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "POST /api/admin/videos error");
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to create video.",
    }, { status: 400 });
  }
}

// ─── YouTube query suggestions (helper endpoint) ──────────────────────────────

export async function PATCH(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  try {
    const body = (await request.json()) as { tags?: string[] };
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const suggestions = deriveYouTubeQuerySuggestions(tags);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
