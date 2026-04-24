import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostsByTag } from "@/lib/blogService";
import { getRelatedForumPosts } from "@/lib/forumService";
import { getTutorials } from "@/lib/tutorialService";
import { getVideosByTags } from "@/lib/videoService";

type HubPageProps = { params: Promise<{ topic: string }> };

export const revalidate = 600;

export async function generateMetadata({ params }: HubPageProps): Promise<Metadata> {
  const { topic } = await params;
  const decoded = decodeURIComponent(topic).trim();
  return {
    title: `${decoded} Knowledge Hub | TatvaOps`,
    description: `Unified knowledge hub for ${decoded}: blogs, forums, tutorials, and shorts.`,
    alternates: { canonical: `/hubs/${encodeURIComponent(decoded)}` },
  };
}

export default async function TopicHubPage({ params }: HubPageProps) {
  const { topic } = await params;
  const decodedTopic = decodeURIComponent(topic).trim();
  if (!decodedTopic) notFound();

  const [blogs, forums, tutorialsResult, shorts] = await Promise.all([
    getPostsByTag(decodedTopic, 20),
    getRelatedForumPosts([decodedTopic], undefined, 20),
    getTutorials({ tag: decodedTopic, limit: 20 }),
    getVideosByTags([decodedTopic], 20),
  ]);

  const tutorials = tutorialsResult.tutorials ?? [];
  if (blogs.length === 0 && forums.length === 0 && tutorials.length === 0 && shorts.length === 0) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-app">#{decodedTopic} Knowledge Hub</h1>
        <p className="mt-2 text-sm text-muted">
          Unified discovery across blogs, forums, tutorials, and shorts.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="ui-card rounded-xl p-4">
          <h2 className="mb-3 text-lg font-semibold text-app">Blogs</h2>
          <div className="space-y-2">
            {blogs.slice(0, 8).map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block text-sm text-sky-700 hover:underline">
                {post.title}
              </Link>
            ))}
            {blogs.length === 0 ? <p className="text-xs text-muted">No blog entries yet.</p> : null}
          </div>
        </article>

        <article className="ui-card rounded-xl p-4">
          <h2 className="mb-3 text-lg font-semibold text-app">Forums</h2>
          <div className="space-y-2">
            {forums.slice(0, 8).map((post) => (
              <Link key={post.slug} href={`/forums/${post.slug}`} className="block text-sm text-sky-700 hover:underline">
                {post.title}
              </Link>
            ))}
            {forums.length === 0 ? <p className="text-xs text-muted">No forum threads yet.</p> : null}
          </div>
        </article>

        <article className="ui-card rounded-xl p-4">
          <h2 className="mb-3 text-lg font-semibold text-app">Tutorials</h2>
          <div className="space-y-2">
            {tutorials.slice(0, 8).map((tutorial) => {
              const t = tutorial as { slug?: string; title?: string };
              const slug = String(t.slug ?? "");
              const title = String(t.title ?? slug);
              return (
                <Link key={slug} href={`/tutorials/${slug}`} className="block text-sm text-sky-700 hover:underline">
                  {title}
                </Link>
              );
            })}
            {tutorials.length === 0 ? <p className="text-xs text-muted">No tutorial entries yet.</p> : null}
          </div>
        </article>

        <article className="ui-card rounded-xl p-4">
          <h2 className="mb-3 text-lg font-semibold text-app">Shorts</h2>
          <div className="space-y-2">
            {shorts.slice(0, 8).map((short) => (
              <Link key={short.slug} href={`/shorts/${short.slug}`} className="block text-sm text-sky-700 hover:underline">
                {short.title}
              </Link>
            ))}
            {shorts.length === 0 ? <p className="text-xs text-muted">No shorts yet.</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}

