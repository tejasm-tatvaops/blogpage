import { buildSummary, buildKeyPoints, buildHashtags, type ContentPayload } from "./shared";

export interface EmailSharePayload {
  subject: string;
  body: string;
  mailtoUrl: string;
}

export interface EmailDistributePayload {
  subject: string;
  html: string;
  text: string;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");

// ─── Client-side mailto share ─────────────────────────────────────────────────

/**
 * Builds a mailto: URL so the user can share an article via their email client.
 */
export const transformShare = (
  payload: ContentPayload,
  resolvedUrl: string,
): EmailSharePayload => {
  const summary = buildSummary({
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    minWords: 60,
    maxWords: 120,
  });
  const keyPoints = buildKeyPoints(summary);

  const subject = `${payload.title} — via TatvaOps`;
  const pointsBlock =
    keyPoints.length > 0
      ? `Key insights:\n${keyPoints.map((p) => `- ${p}`).join("\n")}\n\n`
      : "";
  const body = `${summary}\n\n${pointsBlock}Read the full article: ${resolvedUrl}`;

  return {
    subject,
    body,
    mailtoUrl: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
};

/** Opens the user's default email client with a pre-filled compose window. */
export const share = (payload: ContentPayload, resolvedUrl: string): void => {
  const { mailtoUrl } = transformShare(payload, resolvedUrl);
  window.location.href = mailtoUrl;
};

// ─── Server-side distribution email (sent to subscribers) ────────────────────

/**
 * Builds the HTML/plain-text body for distributing a new post to subscribers.
 * Call this from the distributor; send via lib/newsletterDigest or Resend directly.
 */
export const transformDistribute = (
  payload: ContentPayload & { imageUrl?: string | null },
  resolvedUrl: string,
): EmailDistributePayload => {
  const summary = buildSummary({
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    minWords: 80,
    maxWords: 160,
  });
  const keyPoints = buildKeyPoints(summary);
  const hashtags = buildHashtags(payload.tags, payload.category);

  const subject = `New on TatvaOps: ${payload.title}`;

  const pointsHtml =
    keyPoints.length > 0
      ? `<ul style="padding-left:18px;margin:8px 0 16px;">${keyPoints
          .map((p) => `<li style="margin-bottom:6px;color:#334155;font-size:14px;">${p}</li>`)
          .join("")}</ul>`
      : "";

  const imageHtml = payload.imageUrl
    ? `<img src="${payload.imageUrl}" alt="${payload.title}" style="width:100%;max-width:600px;border-radius:8px;margin-bottom:16px;" />`
    : "";

  const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?email={{email}}`;

  const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;">
  ${imageHtml}
  <h1 style="color:#0f172a;font-size:22px;margin:0 0 12px;">${payload.title}</h1>
  <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">${summary}</p>
  ${pointsHtml}
  <p style="margin:0 0 8px;color:#64748b;font-size:13px;">${hashtags.join(" ")}</p>
  <a href="${resolvedUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
    Read full article
  </a>
  <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px;">
    You are receiving this because you subscribed on TatvaOps.
    <a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe</a>
  </p>
</div>`;

  const text = `${payload.title}\n\n${summary}\n\nRead full article: ${resolvedUrl}\n\nUnsubscribe: ${unsubUrl}`;

  return { subject, html, text };
};

// ─── Confirmation email ───────────────────────────────────────────────────────

export const buildConfirmationEmail = (email: string): { subject: string; html: string } => {
  const blogUrl = `${SITE_URL}/blog`;
  return {
    subject: "Welcome to TatvaOps — you're subscribed!",
    html: `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="color:#0f172a;font-size:20px;margin:0 0 12px;">You're in!</h1>
  <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
    Thanks for subscribing to TatvaOps. You'll receive our latest construction intelligence
    guides, cost estimation tips, and forum highlights straight to your inbox.
  </p>
  <a href="${blogUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
    Read latest articles
  </a>
  <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">
    Subscribed as ${email}.
    <a href="${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94a3b8;">Unsubscribe</a>
  </p>
</div>`,
  };
};
