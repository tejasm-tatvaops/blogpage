import { Resend } from "resend";
import { SubscriberModel } from "@/models/Subscriber";
import { getAllPublishedPosts } from "@/lib/blogService";
import { connectToDatabase } from "@/lib/mongodb";

const DEFAULT_FROM = "TatvaOps Blog <onboarding@resend.dev>";
const DIGEST_POST_LIMIT = 5;
const BATCH_SIZE = 50;

const getSiteUrl = (): string => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

const buildDigestHtml = ({
  intro,
  posts,
}: {
  intro: string;
  posts: Array<{ title: string; excerpt: string; slug: string }>;
}): string => {
  const siteUrl = getSiteUrl();
  const postItems = posts
    .map(
      (post) => `
      <li style="margin-bottom:16px;">
        <a href="${siteUrl}/blog/${post.slug}" style="font-size:16px; font-weight:600; color:#0f172a; text-decoration:none;">
          ${post.title}
        </a>
        <p style="margin:6px 0 0; color:#334155; font-size:14px; line-height:1.5;">
          ${post.excerpt}
        </p>
      </li>`,
    )
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
      <h1 style="color:#0f172a; font-size:22px; margin:0 0 12px;">TatvaOps Weekly Digest</h1>
      <p style="margin:0 0 18px; color:#334155; font-size:15px; line-height:1.6;">${intro}</p>
      <ul style="padding-left:18px; margin:0;">${postItems}</ul>
      <p style="margin:20px 0 0; color:#64748b; font-size:13px;">
        You are receiving this because you subscribed on TatvaOps.
      </p>
    </div>
  `;
};

export const sendNewsletterDigest = async ({
  intro = "Here are this week's most relevant posts from TatvaOps.",
}: {
  intro?: string;
} = {}): Promise<{
  recipients: number;
  postsIncluded: number;
  sent: number;
  failed: number;
}> => {
  await connectToDatabase();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }

  const from = process.env.NEWSLETTER_FROM || DEFAULT_FROM;
  const subscribers = await SubscriberModel.find({ active: true }).select("email").lean();
  const recipients = subscribers.map((s) => s.email).filter(Boolean);
  if (recipients.length === 0) {
    return { recipients: 0, postsIncluded: 0, sent: 0, failed: 0 };
  }

  const recentPosts = await getAllPublishedPosts({ limit: DIGEST_POST_LIMIT, sort: "latest" });
  if (recentPosts.length === 0) {
    return { recipients: recipients.length, postsIncluded: 0, sent: 0, failed: 0 };
  }

  const resend = new Resend(apiKey);
  const subject = `TatvaOps Digest: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const html = buildDigestHtml({
    intro,
    posts: recentPosts.map((post) => ({
      title: post.title,
      excerpt: post.excerpt,
      slug: post.slug,
    })),
  });

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((to) =>
        resend.emails.send({
          from,
          to,
          subject,
          html,
        }),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && !result.value.error) sent += 1;
      else failed += 1;
    }
  }

  return { recipients: recipients.length, postsIncluded: recentPosts.length, sent, failed };
};
