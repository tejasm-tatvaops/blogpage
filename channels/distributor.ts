/**
 * Unified content distributor.
 *
 * Server-side: call distributeContent() after publishing a blog post to
 * push it through every requested channel automatically.
 *
 * Client-side: ShareButtons imports the individual channel modules directly
 * (twitterChannel, linkedinChannel, etc.) for on-demand user sharing.
 *
 * Supported channels:
 *   whatsapp | linkedin | twitter | email | instagram | threads
 */

import { Resend } from "resend";
import { connectToDatabase } from "@/lib/mongodb";
import { SubscriberModel } from "@/models/Subscriber";
import * as emailChannel from "./emailChannel";
import * as twitterChannel from "./twitterChannel";
import * as linkedinChannel from "./linkedinChannel";
import * as whatsappChannel from "./whatsappChannel";
import * as threadsChannel from "./threadsChannel";
import * as instagramChannel from "./instagramChannel";

export type ChannelName =
  | "whatsapp"
  | "linkedin"
  | "twitter"
  | "email"
  | "instagram"
  | "threads";

export interface DistributableContent {
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  category?: string;
  imageUrl?: string | null;
}

export interface ChannelResult {
  channel: ChannelName;
  success: boolean;
  detail?: string;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");

const resolveUrl = (slug: string) => `${SITE_URL}/blog/${slug}`;

// ─── Per-channel server-side dispatch ────────────────────────────────────────

async function dispatchEmail(content: DistributableContent): Promise<ChannelResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { channel: "email", success: false, detail: "RESEND_API_KEY not set" };
  }

  try {
    await connectToDatabase();
    const subscribers = await SubscriberModel.find({ active: true }).select("email").lean();
    const recipients = subscribers.map((s) => s.email as string).filter(Boolean);

    if (recipients.length === 0) {
      return { channel: "email", success: true, detail: "No active subscribers" };
    }

    const url = resolveUrl(content.slug);
    const { subject, html } = emailChannel.transformDistribute(content, url);
    const from = process.env.NEWSLETTER_FROM ?? "TatvaOps Blog <onboarding@resend.dev>";
    const resend = new Resend(apiKey);

    const BATCH = 50;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((to) =>
          resend.emails.send({ from, to, subject, html: html.replace("{{email}}", to) }),
        ),
      );
      for (const r of results) {
        if (r.status === "fulfilled" && !r.value.error) sent += 1;
        else failed += 1;
      }
    }

    return {
      channel: "email",
      success: failed === 0,
      detail: `sent=${sent} failed=${failed}`,
    };
  } catch (err) {
    return {
      channel: "email",
      success: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Twitter/X — server-side auto-posting requires OAuth credentials.
 * Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN,
 * TWITTER_ACCESS_SECRET in your environment to enable this.
 *
 * The transform function is always available; the actual POST to the API
 * is gated on the presence of credentials.
 */
async function dispatchTwitter(content: DistributableContent): Promise<ChannelResult> {
  const { text } = twitterChannel.transform(content, resolveUrl(content.slug));

  const hasCredentials =
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET;

  if (!hasCredentials) {
    return {
      channel: "twitter",
      success: false,
      detail: `Twitter credentials not set. Prepared text: "${text.slice(0, 80)}..."`,
    };
  }

  // Integrate with twitter-api-v2 or similar when credentials are available.
  return { channel: "twitter", success: false, detail: "Server-side Twitter posting not yet wired (credentials present but posting not implemented)" };
}

/**
 * LinkedIn — server-side auto-posting requires a LinkedIn app OAuth token.
 * Set LINKEDIN_ACCESS_TOKEN to enable.
 */
async function dispatchLinkedIn(content: DistributableContent): Promise<ChannelResult> {
  const { text } = linkedinChannel.transform(content, resolveUrl(content.slug));

  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    return {
      channel: "linkedin",
      success: false,
      detail: `LINKEDIN_ACCESS_TOKEN not set. Prepared text: "${text.slice(0, 80)}..."`,
    };
  }

  return { channel: "linkedin", success: false, detail: "Server-side LinkedIn posting not yet wired" };
}

/**
 * WhatsApp Business API — requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TOKEN.
 * The transform is always available for client-side sharing.
 */
async function dispatchWhatsApp(content: DistributableContent): Promise<ChannelResult> {
  const { text } = whatsappChannel.transform(content, resolveUrl(content.slug));

  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_TOKEN) {
    return {
      channel: "whatsapp",
      success: false,
      detail: `WhatsApp Business API credentials not set. Prepared text: "${text.slice(0, 80)}..."`,
    };
  }

  return { channel: "whatsapp", success: false, detail: "Server-side WhatsApp Business posting not yet wired" };
}

/**
 * Threads API — requires THREADS_ACCESS_TOKEN (Meta Developer App).
 * The transform is always available for client-side sharing via intent URL.
 */
async function dispatchThreads(content: DistributableContent): Promise<ChannelResult> {
  const { text } = threadsChannel.transform(content, resolveUrl(content.slug));

  if (!process.env.THREADS_ACCESS_TOKEN) {
    return {
      channel: "threads",
      success: false,
      detail: `THREADS_ACCESS_TOKEN not set. Prepared text: "${text.slice(0, 80)}..."`,
    };
  }

  return { channel: "threads", success: false, detail: "Server-side Threads posting not yet wired" };
}

/**
 * Instagram Graph API — requires INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID.
 * Client-side sharing is always available via instagramChannel.share().
 */
async function dispatchInstagram(content: DistributableContent): Promise<ChannelResult> {
  const { fullCaption } = instagramChannel.transform(content);

  if (!process.env.INSTAGRAM_ACCESS_TOKEN || !process.env.INSTAGRAM_ACCOUNT_ID) {
    return {
      channel: "instagram",
      success: false,
      detail: `Instagram Graph API credentials not set. Prepared caption: "${fullCaption.slice(0, 80)}..."`,
    };
  }

  return { channel: "instagram", success: false, detail: "Server-side Instagram posting not yet wired" };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Distribute content to one or more channels.
 *
 * @example
 * await distributeContent(post, ["email", "twitter", "threads"]);
 */
export async function distributeContent(
  content: DistributableContent,
  channels: ChannelName[],
): Promise<ChannelResult[]> {
  const dispatchers: Record<ChannelName, (c: DistributableContent) => Promise<ChannelResult>> = {
    email: dispatchEmail,
    twitter: dispatchTwitter,
    linkedin: dispatchLinkedIn,
    whatsapp: dispatchWhatsApp,
    threads: dispatchThreads,
    instagram: dispatchInstagram,
  };

  const results = await Promise.allSettled(
    channels.map((ch) => dispatchers[ch](content)),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      channel: channels[i],
      success: false,
      detail: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}

// Re-export channel transforms for convenience
export { twitterChannel, linkedinChannel, whatsappChannel, emailChannel, instagramChannel, threadsChannel };
