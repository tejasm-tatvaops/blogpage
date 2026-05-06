import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blogService";
import { UniversalAskClient } from "@/components/ask/UniversalAskClient";
import { getProjectJournalsPersistent } from "@/lib/siteJournalService";

export const metadata: Metadata = {
  title: "Ask AI | TatvaOps",
  description: "Ask AI across TatvaOps platform knowledge with grounded citations.",
};

type AskPageProps = {
  searchParams?: Promise<{
    prompt?: string;
    anchor?: string;
    journal?: string;
    week?: string;
    city?: string;
    risks?: string;
    tags?: string;
    discussions?: string;
    expertise?: string;
  }>;
};

export default async function AskPage({ searchParams }: AskPageProps) {
  const [posts, journals] = await Promise.all([
    getAllPosts({ limit: 60 }).catch(() => []),
    getProjectJournalsPersistent().then((items) => items.slice(0, 30)),
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
  const options = [...journalOptions, ...blogOptions];
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialQuery = typeof resolvedSearchParams?.prompt === "string" ? resolvedSearchParams.prompt : "";
  const initialSlug = typeof resolvedSearchParams?.anchor === "string" ? resolvedSearchParams.anchor : "";
  const ecosystemContext = {
    currentSiteJournal: typeof resolvedSearchParams?.journal === "string" ? resolvedSearchParams.journal : "",
    timelineWeek: typeof resolvedSearchParams?.week === "string" ? resolvedSearchParams.week : "",
    city: typeof resolvedSearchParams?.city === "string" ? resolvedSearchParams.city : "",
    activeRisks: typeof resolvedSearchParams?.risks === "string" ? resolvedSearchParams.risks : "",
    tags: typeof resolvedSearchParams?.tags === "string" ? resolvedSearchParams.tags : "",
    relatedDiscussions: typeof resolvedSearchParams?.discussions === "string" ? resolvedSearchParams.discussions : "",
    contributorExpertise: typeof resolvedSearchParams?.expertise === "string" ? resolvedSearchParams.expertise : "",
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-6">
        <p className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          Platform AI
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-app sm:text-4xl">
          Ask AI anything on this platform
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          Grounded in platform blogs, tutorials, forums, and shorts through the connected knowledge graph.
        </p>
      </div>

      <UniversalAskClient
        options={options}
        initialQuery={initialQuery}
        initialSlug={initialSlug}
        ecosystemContext={ecosystemContext}
      />
    </section>
  );
}

