"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const AUTOSAVE_KEY = "admin-blog-form-draft";

const createSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const defaultForm = (post?: BlogPost): FormState => ({
  title: post?.title ?? "",
  slug: post?.slug ?? "",
  excerpt: post?.excerpt ?? "",
  content: post?.content ?? "",
  cover_image: post?.cover_image ?? "",
  author: post?.author ?? "TatvaOps Editorial",
  category: post?.category ?? "",
  tags: post?.tags.join(", ") ?? "",
  published: post?.published ?? false,
});

export function AdminBlogForm({ mode, initialPost }: AdminBlogFormProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [form, setForm] = useState<FormState>(() => {
    // In create mode, attempt to restore a saved draft from localStorage.
    if (mode === "create" && typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(AUTOSAVE_KEY);
        if (saved) return JSON.parse(saved) as FormState;
      } catch {
        // Ignore parse errors — start fresh.
      }
    }
    return defaultForm(initialPost);
  });

  const tagsArray = useMemo(
    () =>
      form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [form.tags],
  );

  // Debounced auto-save for create mode only.
  useEffect(() => {
    if (mode !== "create") return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form));
        setAutoSavedAt(new Date());
      } catch {
        // Ignore storage quota errors.
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form, mode]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // Ignore.
    }
    setAutoSavedAt(null);
  };

  const onGenerate = useCallback(() => {
    if (isGenerating || !keyword.trim()) return;

    // Debounce: ignore clicks within 500 ms of the last one.
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
          cover_image?: string;
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
          cover_image: json.cover_image ?? prev.cover_image,
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

      // Clear draft after successful save.
      clearDraft();
      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onImageFileSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large. Maximum size is 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setError("Failed to read image file.");
        return;
      }
      setError(null);
      setForm((prev) => ({ ...prev, cover_image: result }));
    };
    reader.onerror = () => setError("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {mode === "create" ? "Create blog post" : "Edit blog post"}
      </h1>

      {mode === "create" && (
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          {autoSavedAt ? (
            <span>
              Draft auto-saved at{" "}
              {autoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span>Changes are auto-saved as you type</span>
          )}
          <button
            type="button"
            onClick={() => {
              clearDraft();
              setForm(defaultForm());
            }}
            className="text-red-500 underline hover:text-red-700"
          >
            Discard draft
          </button>
        </div>
      )}

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
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Cover image</p>
            {form.cover_image && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, cover_image: "" }))}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove image
              </button>
            )}
          </div>

          <input
            value={form.cover_image}
            onChange={(e) => setForm((prev) => ({ ...prev, cover_image: e.target.value }))}
            placeholder="Paste image URL (https://...) or upload below"
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
          />

          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onImageFileSelected(e.target.files?.[0] ?? null)}
          />

          <button
            type="button"
            onClick={() => imageFileInputRef.current?.click()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Choose image from device
          </button>

          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDraggingImage(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingImage(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingImage(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingImage(false);
              onImageFileSelected(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition ${
              isDraggingImage
                ? "border-sky-400 bg-sky-50 text-sky-700"
                : "border-slate-300 bg-white text-slate-500"
            }`}
          >
            Drag and drop an image here
          </div>

          {form.cover_image && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img
                src={form.cover_image}
                alt="Cover preview"
                className="h-44 w-full object-cover"
                onError={() => setError("Cover image preview failed. Check URL or pick another image.")}
              />
            </div>
          )}
        </div>
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
