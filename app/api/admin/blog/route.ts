import { NextResponse } from "next/server";
import { createPost, getAllPosts, type BlogPostWriteInput } from "@/lib/blogService";
import { requireAdminApiAccess } from "@/lib/adminAuth";

const parsePayload = (value: unknown): BlogPostWriteInput => {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid payload.");
  }

  const body = value as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const content = String(body.content ?? "").trim();
  const excerpt = String(body.excerpt ?? "").trim();
  const cover_image = String(body.cover_image ?? "").trim();
  const author = String(body.author ?? "").trim();
  const category = String(body.category ?? "").trim();
  const published = Boolean(body.published);

  if (!title || !content || !excerpt || !author || !category) {
    throw new Error("Missing required fields.");
  }

  const tagsRaw = Array.isArray(body.tags) ? body.tags : [];
  const tags = tagsRaw
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 20);

  return {
    title,
    slug: slug || undefined,
    content,
    excerpt,
    cover_image: cover_image || null,
    author,
    tags,
    category,
    published,
  };
};

export async function GET() {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posts = await getAllPosts({ includeDrafts: true, limit: 1000 });
    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch posts." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = parsePayload(body);
    const post = await createPost(payload);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create post." },
      { status: 400 },
    );
  }
}
