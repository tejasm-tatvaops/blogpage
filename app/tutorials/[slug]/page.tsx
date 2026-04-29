import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { getTutorialBySlug } from "@/lib/tutorialService";
import { TutorialProgressCard } from "@/components/tutorials/TutorialProgressCard";
import { InteractiveBlocks } from "@/components/tutorials/InteractiveBlocks";
import { TutorialRecommendations } from "@/components/tutorials/TutorialRecommendations";
import { TutorialSidebar } from "@/components/tutorials/TutorialSidebar";
import { getSystemToggles } from "@/lib/systemToggles";
import { getTutorials } from "@/lib/tutorialService";
import { rankSemanticTutorialRecommendations } from "@/lib/semanticRecommendations";
import { getForumPosts } from "@/lib/forumService";
import { getVideosByTags } from "@/lib/videoService";
import { KnowledgeEcosystemPanel } from "@/components/knowledge/KnowledgeEcosystemPanel";
import { extractInlineVideoSource, getTutorialVideoSource } from "@/lib/tutorialVideo";
import { LearningExperience } from "@/components/tutorial/LearningExperience";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const tutorial = await getTutorialBySlug(decodeURIComponent(slug)).catch(() => null);
  if (!tutorial) return { title: "Tutorial Not Found" };
  return {
    title: (tutorial as unknown as { title: string }).title,
    description: (tutorial as unknown as { excerpt: string }).excerpt,
  };
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermediate: "bg-amber-50 text-amber-700 border-amber-200",
  advanced:     "bg-red-50 text-red-700 border-red-200",
};

export default async function TutorialDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tutorial = await getTutorialBySlug(decodeURIComponent(slug)).catch(() => null);
  if (!tutorial) notFound();
  const toggles = getSystemToggles();
  const {
    interactiveBlocksEnabled,
    semanticRecommendationsEnabled,
    behavioralBoostEnabled,
    recommendationDiversityEnabled,
    recommendationFreshnessEnabled,
  } = toggles;

  const t = tutorial as unknown as {
    title: string;
    excerpt: string;
    content: string;
    difficulty: string;
    estimated_minutes: number;
    author: string;
    tags: string[];
    content_type: string;
    cover_image: string | null;
    linked_video_slug: string | null;
    linked_blog_slug:  string | null;
    transcript?: Array<{ time: number; text: string }>;
    interactive_blocks?: Array<{
      block_id: string;
      type: "quiz" | "exercise" | "challenge";
      title: string;
      prompt: string;
      options?: string[];
      answer_index?: number | null;
      explanation?: string | null;
    }>;
    created_at: Date;
  };

  const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
      img: ["src", "alt", "title", "width", "height", "loading"],
    },
  };
  const [semanticRecommendations, relatedForums, relatedShorts] = await Promise.all([
    semanticRecommendationsEnabled
    ? await rankSemanticTutorialRecommendations(
        {
          slug: decodeURIComponent(slug),
          title: t.title,
          excerpt: t.excerpt,
          tags: t.tags,
          category: "tutorials",
          difficulty: t.difficulty,
        },
        (
          (await getTutorials({ limit: 80, includeUnpublished: false })).tutorials as Array<{
            slug: string;
            title: string;
            excerpt: string;
            tags: string[];
            category?: string;
            difficulty?: string;
          }>
        ).map((tutorial) => ({
          ...tutorial,
          category: tutorial.category ?? "tutorials",
        })),
        4,
        {
          behavioralBoostEnabled,
          recommendationDiversityEnabled,
          recommendationFreshnessEnabled,
          requestId: `tutorial:${decodeURIComponent(slug)}`,
        },
      )
    : [],
    getForumPosts({ tag: t.tags[0], limit: 4, sort: "hot" }).then((result) => result.posts).catch(() => []),
    getVideosByTags(t.tags, 4).catch(() => []),
  ]);
  const plainInteractiveBlocks = Array.isArray(t.interactive_blocks)
    ? t.interactive_blocks.map((block) => ({
        block_id: String(block.block_id),
        type: block.type,
        title: String(block.title),
        prompt: String(block.prompt),
        options: Array.isArray(block.options) ? block.options.map((opt) => String(opt)) : [],
        answer_index:
          typeof block.answer_index === "number" && Number.isFinite(block.answer_index)
            ? block.answer_index
            : null,
        explanation: block.explanation ? String(block.explanation) : null,
      }))
    : [];
  const plainSemanticRecommendations = semanticRecommendations.map((item) => ({
    slug: String(item.slug),
    title: String(item.title),
    excerpt: String(item.excerpt),
    difficulty: item.difficulty ? String(item.difficulty) : undefined,
  }));
  const { videoUrl: inlineVideoUrl, cleanedContent } = extractInlineVideoSource(t.content);

  const sidebarTutorials = plainSemanticRecommendations.map((item) => ({
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    difficulty: item.difficulty,
    tags: t.tags, // approximate — same topic area
  }));

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
      {/* Two-column grid — mirrors blog layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-10">

        {/* ── Main column ── */}
        <div className="min-w-0">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/tutorials" className="text-sm text-sky-600 hover:underline">
              ← All Tutorials
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-medium capitalize ${
                  DIFFICULTY_COLORS[t.difficulty] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {t.difficulty}
              </span>
              <span className="text-xs text-slate-400">{t.estimated_minutes} min read</span>
              <span className="text-xs text-slate-400">By {t.author}</span>
            </div>
            <h1 className="text-2xl font-bold text-app sm:text-3xl">{t.title}</h1>
            <p className="mt-3 text-slate-500">{t.excerpt}</p>
          </div>

          {/* Companion video link */}
          {t.linked_video_slug && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-sky-500">
                <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <Link href={`/shorts/${t.linked_video_slug}`} className="text-sm font-medium text-sky-700 hover:underline">
                Watch the companion short video
              </Link>
            </div>
          )}

          {/* Cover image */}
          {t.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t.cover_image}
              alt={t.title}
              loading="lazy"
              decoding="async"
              className="mb-8 w-full rounded-xl object-cover"
              style={{ maxHeight: "420px" }}
            />
          )}

          {/* Progress */}
          <div className="mb-6">
            <TutorialProgressCard slug={decodeURIComponent(slug)} />
          </div>

          {t.content_type === "video" && inlineVideoUrl ? (
            <LearningExperience
              slug={decodeURIComponent(slug)}
              title={t.title}
              videoUrl={inlineVideoUrl}
              markdown={cleanedContent}
              storedTranscript={Array.isArray(t.transcript) && t.transcript.length > 0 ? t.transcript : undefined}
              description={t.excerpt}
            />
          ) : (
            <>
              {/* Inline video for tutorials with embedded media */}
              {inlineVideoUrl && (
                <div className="mb-6 overflow-hidden rounded-xl border border-app bg-surface">
                  {(() => {
                    const videoSource = getTutorialVideoSource(inlineVideoUrl);
                    if (videoSource.kind === "youtube") {
                      return (
                        <iframe
                          src={videoSource.url}
                          title={`${t.title} video`}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="aspect-video w-full"
                        />
                      );
                    }
                    return (
                      <video
                        src={videoSource.url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full"
                      />
                    );
                  })()}
                </div>
              )}

              {/* Content */}
              <article className="prose prose-slate max-w-none prose-img:rounded-lg prose-img:w-full">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                  components={{
                    img({ src, alt, title }) {
                      if (!src) return null;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={alt ?? ""}
                          title={title}
                          loading="lazy"
                          decoding="async"
                          className="my-4 w-full rounded-lg object-cover"
                          style={{ maxHeight: "560px" }}
                        />
                      );
                    },
                  }}
                >
                  {cleanedContent}
                </ReactMarkdown>
              </article>
            </>
          )}

          {interactiveBlocksEnabled && plainInteractiveBlocks.length > 0 && (
            <InteractiveBlocks slug={decodeURIComponent(slug)} blocks={plainInteractiveBlocks} />
          )}
          {semanticRecommendationsEnabled && plainSemanticRecommendations.length > 0 && (
            <TutorialRecommendations tutorials={plainSemanticRecommendations} />
          )}

          <KnowledgeEcosystemPanel
            topicLabel={t.tags[0] ?? "this tutorial topic"}
            confidence="medium"
            freshnessLabel="Grounded in platform knowledge"
            askAiHref={t.linked_blog_slug ? `/blog/${t.linked_blog_slug}` : "/ask"}
            nextLearn={plainSemanticRecommendations.slice(0, 4).map((item) => ({
              title: item.title,
              href: `/tutorials/${item.slug}`,
              subtitle: item.excerpt,
              reason: item.difficulty ? `Next ${item.difficulty}` : "Recommended",
            }))}
            relatedDiscussions={relatedForums.slice(0, 4).map((forum) => ({
              title: forum.title,
              href: `/forums/${forum.slug}`,
              subtitle: `${forum.comment_count} replies`,
              reason: "Active discussion",
            }))}
            relatedShorts={relatedShorts.slice(0, 4).map((shortItem) => ({
              title: shortItem.title,
              href: `/shorts/${shortItem.slug}`,
              subtitle: shortItem.summary ?? shortItem.shortCaption,
              reason: "Quick recap",
            }))}
            topicHubs={(t.tags ?? []).slice(0, 3).map((tag) => ({
              title: `Topic hub: ${tag}`,
              href: `/tags/${encodeURIComponent(tag)}`,
              subtitle: "Explore all related content",
              reason: "Hub",
            }))}
          />

          {/* Footer navigation */}
          <div className="mt-10 border-t border-app pt-6">
            <Link href="/tutorials" className="text-sm font-medium text-sky-600 hover:underline">
              ← Browse all tutorials
            </Link>
          </div>
        </div>

        {/* ── Sidebar column ── */}
        <TutorialSidebar
          currentSlug={decodeURIComponent(slug)}
          content={t.content}
          tags={t.tags}
          relatedTutorials={sidebarTutorials}
          linkedBlogSlug={t.linked_blog_slug}
        />
      </div>
    </div>
  );
}
