import { NextResponse } from "next/server";
import { z } from "zod";
import type { BlogPostWriteInput } from "@/lib/blogService";

export const errorResponse = (status: number, message: string) =>
  NextResponse.json({ error: message }, { status });

export const readJsonBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Invalid JSON payload.");
  }
};

const blogWriteSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  slug: z
    .string()
    .max(220, "Slug too long")
    .refine((v) => /^[a-z0-9-]*$/.test(v), {
      message: "Slug may only contain lowercase letters, numbers, and hyphens",
    })
    .optional()
    .or(z.literal("")),
  content: z
    .string()
    .min(50, "Content must be at least 50 characters")
    .max(150_000, "Content exceeds maximum length"),
  excerpt: z
    .string()
    .min(10, "Excerpt must be at least 10 characters")
    .max(300, "Excerpt too long"),
  cover_image: z
    .string()
    .url("cover_image must be a valid URL")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  author: z.string().min(1, "Author is required").max(100, "Author name too long").trim(),
  tags: z
    .array(z.string().max(50, "Tag too long").trim())
    .max(20, "Too many tags")
    .default([])
    .transform((tags) => [...new Set(tags.filter(Boolean))]),
  category: z.string().min(1, "Category is required").max(100, "Category too long").trim(),
  published: z.boolean().default(false),
});

export const parseBlogWriteInput = (value: unknown): BlogPostWriteInput => {
  const result = blogWriteSchema.safeParse(value);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message ?? "Invalid payload.");
  }

  const data = result.data;
  return {
    title: data.title,
    slug: data.slug || undefined,
    content: data.content,
    excerpt: data.excerpt,
    cover_image: data.cover_image ?? null,
    author: data.author,
    tags: data.tags,
    category: data.category,
    published: data.published,
  };
};
