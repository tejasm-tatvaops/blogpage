"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { upload, put } from "@vercel/blob/client";

type Step = "select" | "details" | "success";

const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const CONTENT_TAGS = ["Cement", "Concrete", "Steel", "Waterproofing", "Masonry", "RCC", "BOQ", "Site Management", "Quality Control", "Safety"];

function UploadModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [prefetchedToken, setPrefetchedToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "",
    tags: [] as string[],
    estimatedMinutes: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [onClose, previewUrl]);

  const acceptFile = (file: File) => {
    setSelectedFile(file);
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
    setPrefetchedToken(null);
    setStep("details");
    // Pre-fetch blob token while user fills the form — saves ~700ms on publish
    fetch("/api/admin/videos/client-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "blob.generate-client-token",
        payload: { pathname: file.name, clientPayload: null, multipart: false },
      }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.clientToken) setPrefetchedToken(d.clientToken); })
      .catch(() => {});
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  const toggleTag = (tag: string) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));

  const isValid = form.title.trim().length >= 3 && form.difficulty !== "";

  const publishTutorial = async () => {
    if (!isValid || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      const estimatedMinutes = Number(form.estimatedMinutes);
      const ytUrl = youtubeUrl.trim();

      let videoSourceUrl: string;

      if (ytUrl) {
        videoSourceUrl = ytUrl;
      } else if (selectedFile) {
        try {
          const abortCtrl = new AbortController();
          let progressStarted = false;
          const uploadOpts = {
            access: "public" as const,
            contentType: selectedFile.type || "video/mp4",
            multipart: selectedFile.size > 50 * 1024 * 1024,
            onUploadProgress: ({ percentage }: { percentage: number }) => {
              progressStarted = true;
              setUploadProgress(Math.round(percentage));
            },
            abortSignal: abortCtrl.signal,
          };
          const blobUpload = prefetchedToken
            ? put(selectedFile.name, selectedFile, { ...uploadOpts, token: prefetchedToken })
            : upload(selectedFile.name, selectedFile, { ...uploadOpts, handleUploadUrl: "/api/admin/videos/client-upload" });
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => {
              if (!progressStarted) { abortCtrl.abort(); reject(new Error("timeout")); }
            }, 4000)
          );
          const blob = await Promise.race([blobUpload, timeout]);
          videoSourceUrl = blob.url;
        } catch {
          setUploadProgress(0);
          const fd = new FormData();
          fd.append("file", selectedFile);
          const up = await fetch("/api/admin/videos/upload", { method: "POST", body: fd });
          if (!up.ok) {
            if (up.status === 413) throw new Error("File too large. Use a YouTube link instead.");
            const d = await up.json().catch(() => null);
            throw new Error(d?.error ?? "Failed to upload video.");
          }
          const d = await up.json();
          if (!d?.videoUrl) throw new Error("Upload succeeded but no URL returned.");
          videoSourceUrl = d.videoUrl.startsWith("http")
            ? d.videoUrl
            : `${window.location.origin}${d.videoUrl}`;
        }
      } else {
        throw new Error("Please upload a video file or paste a video link.");
      }

      const excerpt =
        form.description.trim().length >= 10
          ? form.description.trim()
          : `Video tutorial on ${form.title.trim()}`;
      const content = [
        `## ${form.title.trim()}`,
        "",
        form.description.trim() || "Video tutorial uploaded via admin.",
        "",
        `Video source: ${videoSourceUrl}`,
      ].join("\n");

      const tutorialRes = await fetch("/api/admin/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          excerpt,
          content: content.length >= 50 ? content : `${content}\n\nPractical walkthrough for field execution and planning.`,
          author: "TatvaOps Admin",
          difficulty: form.difficulty.toLowerCase(),
          content_type: "video",
          tags: form.tags,
          category: form.tags[0] ?? "Video Tutorials",
          estimated_minutes: Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? estimatedMinutes : 5,
          published: true,
        }),
      });

      if (!tutorialRes.ok) {
        const data = await tutorialRes.json().catch(() => null);
        throw new Error((data && typeof data.error === "string" && data.error) || "Failed to publish tutorial.");
      }

      setStep("success");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to publish tutorial.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const steps: Step[] = ["select", "details", "success"];
  const stepLabels = ["Upload File", "Video Details", "Published"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Upload Video Tutorial</h2>
            <p className="mt-0.5 text-xs text-slate-400">Share your knowledge with the TatvaOps community</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step bar */}
        <div className="flex items-center border-b border-slate-100 px-5 py-3 dark:border-slate-700/60">
          {steps.map((s, i) => {
            const done = steps.indexOf(step) > i;
            const active = step === s;
            return (
              <div key={s} className="flex flex-1 items-center">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                  done ? "bg-emerald-500 text-white" : active ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <p className={`ml-1.5 text-[11px] font-medium whitespace-nowrap ${active ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>
                  {stepLabels[i]}
                </p>
                {i < steps.length - 1 && <div className="mx-2 h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">

          {/* ── Step 1: File Select ── */}
          {step === "select" && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
                  dragOver
                    ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                    : "border-slate-200 hover:border-sky-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-sky-700/60"
                }`}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-900/30">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-sky-500" aria-hidden>
                    <polyline points="16 16 12 12 8 16" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Drag & drop your video here
                </p>
                <p className="mt-1 text-xs text-slate-400">or click to browse files</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {["MP4", "MOV", "AVI", "WebM", "MKV"].map((ext) => (
                    <span key={ext} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      {ext}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-slate-400">Max 500 MB · Max 15 minutes · 720p or higher recommended</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/mov,video/avi,video/webm,video/x-matroska"
                className="hidden"
                onChange={handleFileInput}
              />

              {/* YT link alternative */}
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Or paste a YouTube link</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setFileName("YouTube link");
                      setStep("details");
                    }}
                    className="shrink-0 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-400"
                  >
                    Use Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {step === "details" && (
            <div className="space-y-4">
              {/* File badge */}
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-700/40 dark:bg-emerald-900/20">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-emerald-600" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="truncate text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{fileName}</span>
                <button
                  onClick={() => setStep("select")}
                  className="ml-auto shrink-0 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Change
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. How to perform a slump test on M25 concrete"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="What will viewers learn from this tutorial?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                />
              </div>

              {/* Difficulty + Duration row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Difficulty <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                  >
                    <option value="">Select…</option>
                    {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="e.g. 8"
                    value={form.estimatedMinutes}
                    onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        form.tags.includes(tag)
                          ? "bg-sky-500 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              {submitError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
                  {submitError}
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Success ── */}
          {step === "success" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">Tutorial Published!</p>
              <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                Your video is live and will appear on the Tutorials page.
              </p>
              <div className="mt-5 w-full rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left dark:border-slate-700/40 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{form.title || "Video tutorial"}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {form.difficulty && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                      {form.difficulty}
                    </span>
                  )}
                  {form.estimatedMinutes && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {form.estimatedMinutes} min
                    </span>
                  )}
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/20 dark:text-sky-400">
                    Video
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-700/60">
          {step === "details" && (
            <>
              <button
                onClick={() => setStep("select")}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Back
              </button>
              <button
                disabled={!isValid || isSubmitting}
                onClick={publishTutorial}
                className="relative flex-1 overflow-hidden rounded-lg bg-sky-500 py-2 text-xs font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && uploadProgress > 0 && (
                  <span
                    className="absolute inset-y-0 left-0 bg-sky-300/40 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
                <span className="relative">
                  {isSubmitting
                    ? uploadProgress > 0 ? `Uploading ${uploadProgress}%…` : "Publishing…"
                    : "Publish Tutorial"}
                </span>
              </button>
            </>
          )}
          {step === "success" && (
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-sky-500 py-2 text-xs font-semibold text-white transition hover:bg-sky-400"
            >
              Done
            </button>
          )}
          {step === "select" && (
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadTutorialButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
        Upload Video
      </button>

      {open && <UploadModal onClose={() => setOpen(false)} />}
    </>
  );
}
