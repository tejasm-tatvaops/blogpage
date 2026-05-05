"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { brandTutorials } from "@/data/brandProfileMock";
import type { BrandTutorial } from "@/data/brandProfileMock";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000    ? `${(n / 1000).toFixed(1)}k`
  : String(n);

// ─── Gradient video area ──────────────────────────────────────────────────────

function VideoArea({ tutorial, playing }: { tutorial: BrandTutorial; playing: boolean }) {
  return (
    <div className={`relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b ${tutorial.gradientClasses} overflow-hidden`}>
      {/* Animated rings when playing */}
      {playing && (
        <>
          <div className="absolute h-72 w-72 animate-ping rounded-full bg-white/5 duration-1000" style={{ animationDuration: "2s" }} />
          <div className="absolute h-48 w-48 animate-ping rounded-full bg-white/5" style={{ animationDuration: "2.4s" }} />
        </>
      )}
      <span className="relative z-10 text-6xl drop-shadow-2xl" style={{ filter: playing ? "drop-shadow(0 0 24px rgba(255,255,255,0.3))" : undefined }}>
        {tutorial.emoji}
      </span>
      <p className="relative z-10 mt-4 max-w-[70%] text-center text-sm font-semibold leading-snug text-white/80 drop-shadow">
        {tutorial.title}
      </p>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        {playing && (
          <div
            className="h-full bg-white/60 transition-all"
            style={{ width: "35%", animation: "progress-grow 30s linear infinite" }}
          />
        )}
      </div>

      <style>{`@keyframes progress-grow { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}

// ─── Viewer Modal ─────────────────────────────────────────────────────────────

function TutorialsViewer({
  startIndex,
  onClose,
}: {
  startIndex: number;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setActiveIndex((i) => Math.min(brandTutorials.length - 1, i + 1)), []);

  // Lock scroll + keyboard nav
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")       onClose();
      if (e.key === "ArrowDown")    next();
      if (e.key === "ArrowUp")      prev();
      if (e.key === " ")            setPlaying((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, next, prev]);

  // Snap scroll via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const slides = Array.from(container.querySelectorAll("[data-slide]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = slides.indexOf(entry.target);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.7 },
    );
    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const toggleLike = (id: string) =>
    setLiked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">

      {/* Close button — top left */}
      <button
        onClick={onClose}
        className="absolute left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
        aria-label="Close"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Brand watermark — top centre */}
      <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur-sm">
          UltraTech Tutorials
        </span>
      </div>

      {/* Vertical snap-scroll container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {brandTutorials.map((t, idx) => (
          <div
            key={t.id}
            data-slide={idx}
            className="relative h-screen w-full shrink-0 snap-start snap-always"
          >
            {/* Phone frame on desktop */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-full w-full overflow-hidden sm:h-[90vh] sm:max-w-sm sm:rounded-2xl sm:shadow-2xl">

                {/* Video area */}
                <div
                  className="h-full w-full cursor-pointer"
                  onClick={() => setPlaying((v) => !v)}
                >
                  <VideoArea tutorial={t} playing={idx === activeIndex && playing} />
                </div>

                {/* Gradient overlays */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

                {/* Play/pause icon flash */}
                {!playing && idx === activeIndex && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Bottom overlay: info */}
                <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-6 pt-12">
                  <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm">
                    {t.tag}
                  </span>
                  <p className="mt-2 text-sm font-bold leading-snug text-white drop-shadow-sm">
                    {t.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/70">
                    {t.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-white/60">
                    <span>{fmt(t.views)} views</span>
                    <span>·</span>
                    <span>{t.duration}</span>
                  </div>
                </div>

                {/* Right action column */}
                <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4">
                  {/* Like */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => toggleLike(t.id)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition ${
                        liked.has(t.id) ? "bg-pink-500/90" : "bg-black/40 hover:bg-black/60"
                      }`}
                      aria-label="Like"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={liked.has(t.id) ? "white" : "none"} stroke="white" strokeWidth="2" aria-hidden>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                    <span className="text-[10px] font-semibold text-white drop-shadow">
                      {fmt(liked.has(t.id) ? t.likes + 1 : t.likes)}
                    </span>
                  </div>

                  {/* Mute */}
                  <button
                    onClick={() => setMuted((v) => !v)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 shadow-lg backdrop-blur-md transition hover:bg-black/60"
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                      </svg>
                    )}
                  </button>

                  {/* Share */}
                  <button
                    onClick={() => navigator.clipboard?.writeText(window.location.href).catch(() => undefined)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 shadow-lg backdrop-blur-md transition hover:bg-black/60"
                    aria-label="Share"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop prev/next arrows */}
      <button
        onClick={prev}
        disabled={activeIndex === 0}
        className="absolute left-4 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-30 sm:flex"
        aria-label="Previous"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        onClick={next}
        disabled={activeIndex === brandTutorials.length - 1}
        className="absolute right-4 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-30 sm:flex"
        aria-label="Next"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1.5">
        {brandTutorials.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setActiveIndex(i);
              const container = containerRef.current;
              const slides = container?.querySelectorAll("[data-slide]");
              slides?.[i]?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
            aria-label={`Go to tutorial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

type UploadStep = "select" | "details" | "success";

const productLineOptions = ["Cement", "Ready Mix Concrete", "Building Products", "Wall Care"];

function UploadModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<UploadStep>("select");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", productLine: "", tags: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setFileName(file.name); setStep("details"); }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFileName(file.name); setStep("details"); }
  };

  const isFormValid = form.title.trim().length > 3 && form.productLine;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-700/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Upload Tutorial</h3>
            <p className="mt-0.5 text-xs text-slate-400">Share a product tutorial with contractors</p>
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

        {/* Step indicator */}
        <div className="flex items-center gap-0 border-b border-slate-100 px-5 py-3 dark:border-slate-700/60">
          {(["select", "details", "success"] as UploadStep[]).map((s, i) => {
            const labels = ["Select File", "Details", "Published"];
            const done = (step === "details" && i === 0) || (step === "success" && i < 2);
            const active = step === s;
            return (
              <div key={s} className="flex flex-1 items-center">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                  done ? "bg-emerald-500 text-white" : active ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <p className={`ml-1.5 text-[11px] font-medium ${active ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>
                  {labels[i]}
                </p>
                {i < 2 && <div className="mx-2 h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5">

          {/* Step 1: File drop */}
          {step === "select" && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                  dragOver
                    ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                    : "border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-700 dark:hover:border-sky-700/60"
                }`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-900/30">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-sky-500" aria-hidden>
                    <polyline points="16 16 12 12 8 16" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Drag & drop your video
                </p>
                <p className="mt-1 text-xs text-slate-400">or click to browse</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {["MP4", "MOV", "AVI", "WebM"].map((ext) => (
                    <span key={ext} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      {ext}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">Max file size: 500 MB · Max duration: 10 min</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/mov,video/avi,video/webm"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          )}

          {/* Step 2: Details form */}
          {step === "details" && (
            <div className="space-y-4">
              {/* File name badge */}
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-700/40 dark:bg-emerald-900/20">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-emerald-600" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="truncate text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{fileName}</span>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Tutorial Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. How to mix OPC 53 for M25 concrete"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what contractors will learn..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Product Line <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.productLine}
                  onChange={(e) => setForm({ ...form, productLine: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                >
                  <option value="">Select product line…</option>
                  {productLineOptions.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="e.g. curing, RCC, mix design"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-sky-900/40"
                />
                <p className="mt-1 text-[10px] text-slate-400">Separate with commas</p>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">Tutorial Submitted!</p>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Your tutorial is under review and will be published on the brand profile within 24 hours.
              </p>
              <div className="mt-4 w-full rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left dark:border-slate-700/40 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{form.title || "Tutorial video"}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{form.productLine} · Pending review</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
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
                onClick={() => setStep("success")}
                disabled={!isFormValid}
                className="flex-1 rounded-lg bg-sky-500 py-2 text-xs font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Publish Tutorial
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

// ─── Thumbnail card ───────────────────────────────────────────────────────────

function TutorialCard({
  tutorial,
  onClick,
}: {
  tutorial: BrandTutorial;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-sky-700/40"
    >
      {/* Thumbnail */}
      <div className={`relative flex h-40 w-full items-center justify-center bg-gradient-to-b ${tutorial.gradientClasses} overflow-hidden`}>
        <span className="text-4xl transition-transform duration-300 group-hover:scale-110">{tutorial.emoji}</span>

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {tutorial.duration}
        </span>

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/0 text-white transition group-hover:bg-black/50 group-hover:scale-110">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="opacity-0 transition group-hover:opacity-100 ml-0.5" aria-hidden>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 text-left">
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
          {tutorial.tag}
        </span>
        <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-slate-800 dark:text-slate-200">
          {tutorial.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
          <span>{fmt(tutorial.views)} views</span>
          <span>·</span>
          <span>{fmt(tutorial.likes)} likes</span>
        </div>
      </div>
    </button>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function BrandTutorials() {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const totalViews = brandTutorials.reduce((s, t) => s + t.views, 0);

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">

        {/* Section header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Video Tutorials
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Product guides and application tutorials · {brandTutorials.length} videos · {fmt(totalViews)} total views
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-400"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Upload Tutorial
          </button>
        </div>

        {/* Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {brandTutorials.map((tutorial, idx) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              onClick={() => setViewerIndex(idx)}
            />
          ))}
        </div>

        {/* Watch all CTA */}
        <button
          onClick={() => setViewerIndex(0)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-700/40 dark:hover:text-sky-400"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Watch All Tutorials
        </button>
      </div>

      {viewerIndex !== null && (
        <TutorialsViewer
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} />
      )}
    </>
  );
}
