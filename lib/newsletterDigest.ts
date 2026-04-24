import { Resend } from "resend";
import { SubscriberModel } from "@/models/Subscriber";
import { getAllPublishedPosts } from "@/lib/blogService";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getBulkPostPerformance, computeEngagementScore } from "@/lib/contentPerformance";

const DEFAULT_FROM = "TatvaOps Blog <onboarding@resend.dev>";
const DIGEST_POST_LIMIT = 5;
const BATCH_SIZE = 50;

const getSiteUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

// ─── HTML builder ─────────────────────────────────────────────────────────────

const buildDigestHtml = ({
  intro,
  posts,
}: {
  intro: string;
  posts: Array<{ title: string; excerpt: string; slug: string; cover_image?: string | null }>;
}): string => {
  const siteUrl = getSiteUrl();
  const unsubBase = `${siteUrl}/api/newsletter/unsubscribe?email=`;

  const postItems = posts
    .map(
      (post) => `
      <li style="margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid #f1f5f9; list-style:none;">
        ${
          post.cover_image
            ? `<img src="${post.cover_image}" alt="${post.title}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;margin-bottom:10px;" />`
            : ""
        }
        <a href="${siteUrl}/blog/${post.slug}" style="font-size:16px; font-weight:600; color:#0f172a; text-decoration:none; line-height:1.4;">
          ${post.title}
        </a>
        <p style="margin:6px 0 8px; color:#334155; font-size:14px; line-height:1.5;">
          ${post.excerpt}
        </p>
        <a href="${siteUrl}/blog/${post.slug}" style="font-size:13px; color:#4f46e5; text-decoration:none; font-weight:500;">
          Read article →
        </a>
      </li>`,
    )
    .join("");

  return `
<div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto; padding:32px 24px; background:#ffffff;">
  <div style="margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #e2e8f0;">
    <h1 style="color:#0f172a; font-size:22px; margin:0 0 4px; font-weight:700;">TatvaOps Weekly Digest</h1>
    <p style="margin:0; color:#64748b; font-size:13px;">
      ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
    </p>
  </div>

  <p style="margin:0 0 24px; color:#334155; font-size:15px; line-height:1.6;">${intro}</p>

  <ul style="padding:0; margin:0;">${postItems}</ul>

  <div style="margin-top:28px; padding-top:20px; border-top:1px solid #e2e8f0;">
    <a href="${siteUrl}/blog" style="display:inline-block; padding:10px 20px; background:#4f46e5; color:#fff; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">
      Browse all articles
    </a>
  </div>

  <p style="margin:24px 0 0; color:#94a3b8; font-size:12px; line-height:1.5;">
    You are receiving this because you subscribed on TatvaOps.
    <a href="${unsubBase}{{email}}" style="color:#94a3b8; text-decoration:underline;">Unsubscribe</a>
  </p>
</div>`;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export type DigestResult = {
  recipients: number;
  postsIncluded: number;
  sent: number;
  failed: number;
};

/**
 * Sends a digest to all active subscribers.
 *
 * Post selection strategy (in order of preference):
 *   1. Top posts by composite engagement score (FeedEvent clicks + likes + shares + dwell)
 *   2. Fallback to most recent posts if no event data exists
 *
 * @param intro - optional intro paragraph shown above the post list
 * @param filterTags - when provided, only include posts whose tags overlap with this set
 */
export const sendNewsletterDigest = async ({
  intro = "Here are this week's top-performing articles from TatvaOps.",
  filterTags,
}: {
  intro?: string;
  filterTags?: string[];
} = {}): Promise<DigestResult> => {
  await connectToDatabase();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const from = process.env.NEWSLETTER_FROM || DEFAULT_FROM;

  const subscribers = await SubscriberModel.find({ active: true }).select("email").lean();
  const recipients = subscribers.map((s) => s.email as string).filter(Boolean);
  if (recipients.length === 0) return { recipients: 0, postsIncluded: 0, sent: 0, failed: 0 };

  // Fetch a larger candidate pool so we can rank by engagement
  const candidateLimit = DIGEST_POST_LIMIT * 6;
  const candidates = await getAllPublishedPosts({ limit: candidateLimit, sort: "latest" });
  if (candidates.length === 0) return { recipients: recipients.length, postsIncluded: 0, sent: 0, failed: 0 };

  // Optional tag filter for segmentation
  const filtered =
    filterTags && filterTags.length > 0
      ? candidates.filter((p) => p.tags.some((t) => filterTags.includes(t)))
      : candidates;

  const pool = filtered.length > 0 ? filtered : candidates;

  // Rank by engagement from FeedEvents
  const perfMap = await getBulkPostPerformance(pool.map((p) => p.slug), 720 /* 30 days */);

  const ranked = [...pool].sort((a, b) => {
    const scoreA =
      computeEngagementScore(perfMap.get(a.slug)!) +
      a.upvote_count * 2 +
      a.view_count * 0.1;
    const scoreB =
      computeEngagementScore(perfMap.get(b.slug)!) +
      b.upvote_count * 2 +
      b.view_count * 0.1;
    return scoreB - scoreA;
  });

  const topPosts = ranked.slice(0, DIGEST_POST_LIMIT);

  const resend = new Resend(apiKey);
  const subject = `TatvaOps Digest: ${new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((to) => {
        const html = buildDigestHtml({
          intro,
          posts: topPosts.map((p) => ({
            title: p.title,
            excerpt: p.excerpt,
            slug: p.slug,
            cover_image: p.cover_image,
          })),
        }).replace("{{email}}", encodeURIComponent(to));

        return resend.emails.send({ from, to, subject, html });
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && !r.value.error) sent += 1;
      else failed += 1;
    }
  }

  return { recipients: recipients.length, postsIncluded: topPosts.length, sent, failed };
};
