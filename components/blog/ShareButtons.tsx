"use client";

import { useState } from "react";
import * as twitterChannel from "@/channels/twitterChannel";
import * as linkedinChannel from "@/channels/linkedinChannel";
import * as whatsappChannel from "@/channels/whatsappChannel";
import * as threadsChannel from "@/channels/threadsChannel";
import * as emailChannel from "@/channels/emailChannel";
import * as instagramChannel from "@/channels/instagramChannel";
import type { ContentPayload } from "@/channels/shared";

type ShareButtonsProps = ContentPayload & {
  imageUrl?: string | null;
};

export function ShareButtons({
  title,
  slug,
  excerpt,
  content,
  tags = [],
  category,
  imageUrl,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);

  const getUrl = () =>
    typeof window !== "undefined"
      ? `${window.location.origin}/blog/${slug}`
      : `/blog/${slug}`;

  /** Fire-and-forget — records which channel was used without blocking the share. */
  const trackShare = (channel: string) => {
    fetch(`/api/blog/${encodeURIComponent(slug)}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    }).catch(() => { /* non-fatal */ });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackShare("copy");
    } catch {
      // clipboard not available
    }
  };

  const payload: ContentPayload = { title, slug, excerpt, content, tags, category };

  const shareTwitter = () => { twitterChannel.share(payload, getUrl()); trackShare("twitter"); };
  const shareLinkedIn = () => { linkedinChannel.share(payload, getUrl()); trackShare("linkedin"); };
  const shareWhatsApp = () => { whatsappChannel.share(payload, getUrl()); trackShare("whatsapp"); };
  const shareThreads = () => { threadsChannel.share(payload, getUrl()); trackShare("threads"); };
  const shareEmail = () => { emailChannel.share(payload, getUrl()); trackShare("email"); };

  const shareInstagram = async () => {
    const used = await instagramChannel.share({ ...payload, imageUrl }, getUrl());
    trackShare("instagram");
    if (!used) {
      setIgCopied(true);
      setTimeout(() => setIgCopied(false), 2500);
    }
  };

  const btnClass =
    "flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500">Share:</span>

      {/* X / Twitter */}
      <button type="button" onClick={shareTwitter} className={btnClass} aria-label="Share on X (Twitter)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X
      </button>

      {/* LinkedIn */}
      <button type="button" onClick={shareLinkedIn} className={btnClass} aria-label="Share on LinkedIn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        LinkedIn
      </button>

      {/* WhatsApp */}
      <button type="button" onClick={shareWhatsApp} className={btnClass} aria-label="Share on WhatsApp">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
        WhatsApp
      </button>

      {/* Threads */}
      <button type="button" onClick={shareThreads} className={btnClass} aria-label="Share on Threads">
        <svg width="13" height="13" viewBox="0 0 192 192" fill="currentColor" aria-hidden>
          <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 6.997 4.67 16.007 6.93 25.353 6.425 12.34-.673 22.022-5.379 28.779-13.99 5.148-6.56 8.406-15.046 9.857-25.735 5.912 3.569 10.275 8.285 12.646 13.982 4.043 9.906 4.286 26.207-8.375 38.868-11.071 11.073-24.395 15.893-44.549 16.039-22.337-.162-39.233-7.326-50.21-21.294C52.019 143.554 46.727 127.04 46.51 106c.217-21.04 5.509-37.554 15.734-49.083 10.978-13.968 27.874-21.132 50.21-21.294 22.497.163 39.67 7.363 51.043 21.398 5.624 6.878 9.867 15.565 12.65 25.875l16.143-4.326c-3.339-12.406-8.766-23.18-16.246-32.053C160.882 29.658 140.498 20.214 116.474 20.02h-.022C92.4 20.215 72.187 29.674 58.03 47.791 45.569 63.96 39.075 86.309 38.828 106v.032c.247 19.691 6.741 42.04 19.202 58.209 14.157 18.117 34.37 27.576 58.424 27.771h.022c21.672-.173 36.905-5.831 49.434-18.36 17.008-17.007 16.534-38.589 10.968-51.81-4.418-10.82-12.983-19.304-25.341-24.854Z" />
        </svg>
        Threads
      </button>

      {/* Instagram */}
      <button
        type="button"
        onClick={shareInstagram}
        className={btnClass}
        aria-label="Share on Instagram"
        title={igCopied ? "Caption copied — paste into Instagram!" : "Share on Instagram"}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        {igCopied ? "Caption copied!" : "Instagram"}
      </button>

      {/* Email */}
      <button type="button" onClick={shareEmail} className={btnClass} aria-label="Share via Email">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polyline points="2,4 12,13 22,4" />
        </svg>
        Email
      </button>

      {/* Copy link */}
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
