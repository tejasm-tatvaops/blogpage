import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blogService";
import { UniversalAskClient } from "@/components/ask/UniversalAskClient";
import { getProjectJournalsPersistent } from "@/lib/siteJournalService";
import { getForumPosts } from "@/lib/forumService";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");
const ASK_URL = `${SITE_URL}/ask`;

export const metadata: Metadata = {
  title: "Ask AI | TatvaOps",
  description: "Ask AI across TatvaOps platform knowledge with grounded citations.",
  alternates: { canonical: ASK_URL },
  openGraph: {
    type: "website",
    url: ASK_URL,
    title: "Ask AI | TatvaOps",
    description: "Get contextual construction intelligence across blogs, forums, and site journals.",
    siteName: "TatvaOps",
  },
  twitter: {
    card: "summary",
    title: "Ask AI | TatvaOps",
    description: "Context-aware construction AI for execution, procurement, and planning decisions.",
    site: "@tatvaops",
  },
};

type AskPageProps = {
  searchParams?: Promise<{
    prompt?: string;
    anchor?: string;
    sourceType?: "blog" | "siteJournal" | "forum";
    aiMode?: "site_analyst" | "cost_strategist" | "planning_engineer" | "safety_auditor" | "debate_synthesizer";
    journal?: string;
    week?: string;
    city?: string;
    risks?: string;
    tags?: string;
    discussions?: string;
    expertise?: string;
    intent?: string;
    page?: string;
  }>;
};

export default async function AskPage({ searchParams }: AskPageProps) {
  const [posts, journals, forumsResult] = await Promise.all([
    getAllPosts({ limit: 60 }).catch(() => []),
    getProjectJournalsPersistent().then((items) => items.slice(0, 30)),
    getForumPosts({ sort: "hot", limit: 30, page: 1 }).catch(() => ({ posts: [] })),
  ]);
  const blogOptions = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    tags: post.tags ?? [],
    category: post.category,
    sourceType: "blog" as const,
  }));
  const journalOptions = journals.map((journal) => ({
    slug: `sj:${journal.slug}`,
    title: journal.title,
    tags: journal.tags ?? [],
    category: `Site Journal • ${journal.city}`,
    sourceType: "siteJournal" as const,
  }));
  const forumOptions = forumsResult.posts.map((thread) => ({
    slug: `fr:${thread.slug}`,
    title: thread.title,
    tags: thread.tags ?? [],
    category: "Forum Discussion",
    sourceType: "forum" as const,
  }));
  const options = [...journalOptions, ...forumOptions, ...blogOptions];
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialQuery = typeof resolvedSearchParams?.prompt === "string" ? resolvedSearchParams.prompt : "";
  const initialSlug = typeof resolvedSearchParams?.anchor === "string" ? resolvedSearchParams.anchor : "";
  const initialMode =
    resolvedSearchParams?.aiMode === "cost_strategist" ||
    resolvedSearchParams?.aiMode === "planning_engineer" ||
    resolvedSearchParams?.aiMode === "safety_auditor" ||
    resolvedSearchParams?.aiMode === "debate_synthesizer"
      ? resolvedSearchParams.aiMode
      : "site_analyst";
  const ecosystemContext = {
    currentPage: typeof resolvedSearchParams?.page === "string" ? resolvedSearchParams.page : "",
    currentSiteJournal: typeof resolvedSearchParams?.journal === "string" ? resolvedSearchParams.journal : "",
    timelineWeek: typeof resolvedSearchParams?.week === "string" ? resolvedSearchParams.week : "",
    city: typeof resolvedSearchParams?.city === "string" ? resolvedSearchParams.city : "",
    activeRisks: typeof resolvedSearchParams?.risks === "string" ? resolvedSearchParams.risks : "",
    tags: typeof resolvedSearchParams?.tags === "string" ? resolvedSearchParams.tags : "",
    relatedDiscussions: typeof resolvedSearchParams?.discussions === "string" ? resolvedSearchParams.discussions : "",
    contributorExpertise: typeof resolvedSearchParams?.expertise === "string" ? resolvedSearchParams.expertise : "",
    userIntent: typeof resolvedSearchParams?.intent === "string" ? resolvedSearchParams.intent : "",
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-app bg-surface p-6 shadow-sm">
        <p className="inline-flex rounded-full bg-subtle px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-app">
          Platform AI
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-app sm:text-4xl">
          Construction Intelligence Layer
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted sm:text-base">
          Ask contextual, mode-aware intelligence across Site Journals, forums, and blogs with grounded citations and operational continuity.
        </p>
      </div>

      <UniversalAskClient
        options={options}
        initialQuery={initialQuery}
        initialSlug={initialSlug}
        initialAiMode={initialMode}
        ecosystemContext={ecosystemContext}
      />
    </section>
  );
}

