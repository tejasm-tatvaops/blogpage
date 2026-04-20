import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blogService";
import { UniversalAskClient } from "@/components/ask/UniversalAskClient";

export const metadata: Metadata = {
  title: "Ask AI | TatvaOps",
  description: "Ask AI across TatvaOps platform knowledge with grounded citations.",
};

export default async function AskPage() {
  const posts = await getAllPosts({ limit: 60 }).catch(() => []);
  const options = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    tags: post.tags ?? [],
    category: post.category,
  }));

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

      <UniversalAskClient options={options} />
    </section>
  );
}

