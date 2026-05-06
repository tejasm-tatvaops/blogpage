import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import { ForumInnerPage } from "@/components/forums/ForumInnerPage";
import { ForumLeftColumn } from "@/components/forums/ForumLeftColumn";
import { ForumRightSidebar } from "@/components/forums/ForumRightSidebar";
import { PostHeader } from "@/components/forums/PostHeader";
import { ReactionBar } from "@/components/forums/ReactionBar";
import { PostBody } from "@/components/forums/PostBody";
import { RepliesCard } from "@/components/forums/RepliesCard";
import { ForumAiSummaryCard } from "@/components/forums/ForumAiSummaryCard";
import { ConsensusInsightsCard } from "@/components/forums/ConsensusInsightsCard";
import { getForumPostBySlug, getForumPosts } from "@/lib/forumService";
import { getComments } from "@/lib/services/comment.service";
import { getActiveUsersByTopic, getUserProfileByIdentityKey } from "@/lib/userProfileService";
import { ForumActiveUsersStrip } from "@/components/users/ForumActiveUsersStrip";
import { buildForumPostJsonLd, buildForumBreadcrumbJsonLd } from "@/lib/forumSeo";
import { generateSEO } from "@/lib/seo";
import { getTutorials } from "@/lib/tutorialService";
import { getVideosByTags } from "@/lib/videoService";
import { KnowledgeEcosystemPanel } from "@/components/knowledge/KnowledgeEcosystemPanel";
import { RelatedSiteJournalsCard } from "@/components/forums/RelatedSiteJournalsCard";
import { getRelatedSiteJournalsForForumPersistent } from "@/lib/siteJournalService";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const { posts } = await getForumPosts({ sort: "new", limit: 50, page: 1 });
    return posts.map((p: { slug: string }) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let post = null;
  try {
    post = await getForumPostBySlug(decodeURIComponent(slug));
  } catch {
    post = null;
  }

  if (!post) {
    return { title: "Thread not found | TatvaOps Forums", robots: { index: false, follow: false } };
  }

  return generateSEO({
    title: `${post.title} | TatvaOps Forums`,
    description: post.excerpt,
    keywords: post.tags,
    url: `${SITE_URL}/forums/${post.slug}`,
    type: "article",
    publishedTime: post.created_at,
    modifiedTime: post.updated_at,
    authors: [post.author_name],
    tags: post.tags,
  });
}

export default async function ForumThreadPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getForumPostBySlug(decodeURIComponent(slug));
  if (!post) notFound();

  const primaryTag = post.tags[0] ?? "";

  const [comments, topicUsers, relatedTutorials, relatedShorts, relatedSiteJournals] = await Promise.all([
    getComments(post.id),
    getActiveUsersByTopic([...post.tags, post.title], 5).catch(() => []),
    getTutorials({ tag: primaryTag || null, limit: 4, includeUnpublished: false }).then((result) => result.tutorials).catch(() => []),
    getVideosByTags(post.tags, 4).catch(() => []),
    getRelatedSiteJournalsForForumPersistent({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      tags: post.tags,
    }, 3),
  ]);
  const authorProfile = post.creator_fingerprint
    ? await getUserProfileByIdentityKey(`fp:${post.creator_fingerprint}`).catch(() => null)
    : null;

  const postJsonLd = buildForumPostJsonLd(post, SITE_URL);
  const breadcrumbJsonLd = buildForumBreadcrumbJsonLd(post, SITE_URL);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ReadingProgressBar />
      <ForumInnerPage
        left={(
          <ForumLeftColumn>
            <PostHeader
              title={post.title}
              slug={post.slug}
              tags={post.tags}
              linkedBlogSlug={post.linked_blog_slug}
              authorName={post.author_name}
              authorTier={post.author_reputation_tier}
              qualityScore={post.quality_score}
              engagementScore={post.engagement_score}
              createdAt={post.created_at}
              viewCount={post.view_count}
              badges={post.badges}
              expertiseBadge={authorProfile?.public_expertise_enabled ? (authorProfile.expertise_badge ?? null) : null}
            />
            <ReactionBar
              slug={post.slug}
              title={post.title}
              excerpt={post.excerpt}
              content={post.content}
              tags={post.tags}
              upvotes={post.upvote_count}
              downvotes={post.downvote_count}
              commentCount={post.comment_count}
            />
            <PostBody content={post.content} />
            <ForumAiSummaryCard slug={post.slug} />
            <ConsensusInsightsCard slug={post.slug} />
            <RelatedSiteJournalsCard journals={relatedSiteJournals} />
            <RepliesCard
              slug={post.slug}
              tags={post.tags}
              initialComments={comments}
              bestCommentId={post.best_comment_id}
              creatorFingerprint={post.creator_fingerprint}
            />
          </ForumLeftColumn>
        )}
        right={(
          <ForumRightSidebar>
            <div className="rounded-2xl border border-app bg-surface p-4 shadow-sm">
              <ForumActiveUsersStrip title="People active in similar threads" users={topicUsers} />
            </div>
            <div className="rounded-2xl border border-app bg-surface p-3 shadow-sm">
              <KnowledgeEcosystemPanel
                topicLabel={primaryTag || "this discussion"}
                confidence="medium"
                freshnessLabel="Community + editorial signals"
                askAiHref={post.linked_blog_slug ? `/blog/${post.linked_blog_slug}` : "/ask"}
                nextLearn={(relatedTutorials as Array<{ slug: string; title: string; excerpt: string; difficulty?: string }>).slice(0, 4).map((tutorial) => ({
                  title: tutorial.title,
                  href: `/tutorials/${tutorial.slug}`,
                  subtitle: tutorial.excerpt,
                  reason: tutorial.difficulty ? `Level ${tutorial.difficulty}` : "Next learn",
                }))}
                relatedDiscussions={relatedSiteJournals.map((journal) => ({
                  title: journal.title,
                  href: `/projects/${journal.slug}`,
                  subtitle: `${journal.city}, ${journal.region}`,
                  reason: "Site Journal",
                }))}
                relatedShorts={relatedShorts.slice(0, 4).map((video) => ({
                  title: video.title,
                  href: `/shorts/${video.slug}`,
                  subtitle: video.summary ?? video.shortCaption,
                  reason: "Visual explainer",
                }))}
                topicHubs={post.tags.slice(0, 3).map((tag) => ({
                  title: `Topic hub: ${tag}`,
                  href: `/tags/${encodeURIComponent(tag)}`,
                  subtitle: "Connected blogs, tutorials, and shorts",
                  reason: "Hub",
                }))}
              />
            </div>
          </ForumRightSidebar>
        )}
      />
    </>
  );
}
