"use client";

import { useState } from "react";

type ShareButtonsProps = {
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  category?: string;
};

const stripMarkdown = (value: string): string =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const trimToWords = (value: string, maxWords: number): string => {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ").trim()}...`;
};

const buildSummary = ({
  title,
  excerpt,
  content,
  minWords = 100,
  maxWords = 200,
}: {
  title: string;
  excerpt?: string;
  content?: string;
  minWords?: number;
  maxWords?: number;
}): string => {
  const excerptClean = stripMarkdown(excerpt ?? "");
  const bodyClean = stripMarkdown(content ?? "");

  const parts = [`${title}.`];
  if (excerptClean) parts.push(excerptClean);
  if (bodyClean) parts.push(bodyClean);

  const merged = parts.join(" ").replace(/\s+/g, " ").trim();
  const words = merged.split(/\s+/).filter(Boolean);
  if (words.length === 0) return title;
  if (words.length > maxWords) return trimToWords(merged, maxWords);
  if (words.length >= minWords) return merged;

  const padded = `${merged} ${excerptClean || title} ${bodyClean}`.replace(/\s+/g, " ").trim();
  return trimToWords(padded, minWords);
};

const toHashtag = (value: string): string =>
  `#${value
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join("")}`;

const buildHashtags = (tags: string[] = [], category?: string): string[] => {
  const pool = [...tags, category ?? "", "Construction", "TatvaOps"].filter(Boolean);
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of pool) {
    const tag = toHashtag(item);
    if (tag.length <= 1) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(tag);
    if (output.length >= 6) break;
  }
  return output;
};

export function ShareButtons({ title, slug, excerpt, content, tags = [], category }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const getUrl = () =>
    typeof window !== "undefined"
      ? `${window.location.origin}/blog/${slug}`
      : `/blog/${slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  const shareTwitter = () => {
    const summary = buildSummary({ title, excerpt, content, minWords: 50, maxWords: 70 });
    const hashtags = buildHashtags(tags, category).join(" ");
    const text = trimToWords(`${summary}\n\n${hashtags}`, 45);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getUrl())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareLinkedIn = () => {
    const summary = buildSummary({ title, excerpt, content });
    const hashtags = buildHashtags(tags, category).join(" ");
    const text = `${summary}\n\n${hashtags}\n\n${getUrl()}`;
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareWhatsApp = () => {
    const summary = buildSummary({ title, excerpt, content });
    const hashtags = buildHashtags(tags, category).join(" ");
    const url = `https://wa.me/?text=${encodeURIComponent(`${summary}\n\n${hashtags}\n\n${getUrl()}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const btnClass =
    "flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500">Share:</span>

      <button type="button" onClick={shareTwitter} className={btnClass} aria-label="Share on X (Twitter)">
        {/* X / Twitter icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X
      </button>

      <button type="button" onClick={shareLinkedIn} className={btnClass} aria-label="Share on LinkedIn">
        {/* LinkedIn icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        LinkedIn
      </button>

      <button type="button" onClick={shareWhatsApp} className={btnClass} aria-label="Share on WhatsApp">
        {/* WhatsApp icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
        WhatsApp
      </button>

      <button type="button" onClick={copyLink} className={btnClass} aria-label="Copy link">
        {copied ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Copy link
          </>
        )}
      </button>
    </div>
  );
}
