"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BlogPost } from "@/lib/blogService";

type AdminBlogFormProps = {
  mode: "create" | "edit";
  initialPost?: BlogPost;
};

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: string;
  category: string;
  tags: string;
  published: boolean;
};

const createSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export function AdminBlogForm({ mode, initialPost }: AdminBlogFormProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<FormState>({
    title: initialPost?.title ?? "",
    slug: initialPost?.slug ?? "",
    excerpt: initialPost?.excerpt ?? "",
    content: initialPost?.content ?? "",
    cover_image: initialPost?.cover_image ?? "",
    author: initialPost?.author ?? "TatvaOps Editorial",
    category: initialPost?.category ?? "",
    tags: initialPost?.tags.join(", ") ?? "",
    published: initialPost?.published ?? false,
  });

  const tagsArray = useMemo(
    () =>
      form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [form.tags],
  );

  const onGenerate = useCallback(() => {
    if (isGenerating || !keyword.trim()) return;

    // Debounce: ignore clicks within 500 ms of the last one
    if (generateTimeoutRef.current) return;
    generateTimeoutRef.current = setTimeout(() => {
      generateTimeoutRef.current = null;
    }, 500);

    const run = async () => {
      try {
        setError(null);
        setIsGenerating(true);

        const response = await fetch("/api/generate-blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: keyword.trim() }),
        });

        const json = (await response.json()) as {
          error?: string;
          title?: string;
          slug?: string;
          excerpt?: string;
          content?: string;
          tags?: string[];
          category?: string;
        };

        if (!response.ok) {
          throw new Error(json.error ?? "Failed to generate content.");
        }

        setForm((prev) => ({
          ...prev,
          title: json.title ?? prev.title,
          slug: json.slug ?? createSlug(json.title ?? prev.title),
          excerpt: json.excerpt ?? prev.excerpt,
          content: json.content ?? prev.content,
          tags: (json.tags ?? []).join(", ") || prev.tags,
          category: json.category ?? prev.category,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate with AI.");
      } finally {
        setIsGenerating(false);
      }
    };

    void run();
  }, [isGenerating, keyword]);

  const onSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        tags: tagsArray,
        slug: form.slug || createSlug(form.title),
      };

      const url =
        mode === "create"
          ? "/api/admin/blog"
          : `/api/admin/blog/${encodeURIComponent(initialPost!.id)}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save post.");
      }

      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {mode === "create" ? "Create blog post" : "Edit blog post"}
      </h1>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Keyword for AI generator
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. boq software for contractors"
            maxLength={200}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !keyword.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate with AI"}
          </button>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <input
          value={form.title}
          onChange={(e) => {
            const title = e.target.value;
            setForm((prev) => ({
              ...prev,
              title,
              slug: prev.slug ? prev.slug : createSlug(title),
            }));
          }}
          placeholder="Title"
          maxLength={200}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
          required
        />
        <input
          value={form.slug}
          onChange={(e) => setForm((prev) => ({ ...prev, slug: createSlug(e.target.value) }))}
          placeholder="slug"
          maxLength={220}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
          required
        />
        <input
          value={form.excerpt}
          onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
          placeholder="Excerpt"
          maxLength={300}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
          required
        />
        <input
          value={form.cover_image}
          onChange={(e) => setForm((prev) => ({ ...prev, cover_image: e.target.value }))}
          placeholder="Cover image URL (https://...)"
          type="url"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            value={form.author}
            onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
            placeholder="Author"
            maxLength={100}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
            required
          />
          <input
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            placeholder="Category"
            maxLength={100}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
            required
          />
        </div>
        <input
          value={form.tags}
          onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
          placeholder="Tags (comma separated)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
        />
        <textarea
          value={form.content}
          onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
          rows={20}
          placeholder="Markdown content"
          maxLength={150_000}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
          required
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
          />
          Published
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-sky-800 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save post"}
        </button>
      </form>
    </section>
  );
}
