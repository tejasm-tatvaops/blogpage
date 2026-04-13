import { NextResponse } from "next/server";
import {
  deletePost,
  getPostById,
  type BlogPostWriteInput,
  updatePost,
} from "@/lib/blogService";
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch post." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const payload = parsePayload(body);
    const post = await updatePost(id, payload);
    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update post." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deletePost(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete post." },
      { status: 400 },
    );
  }
}
