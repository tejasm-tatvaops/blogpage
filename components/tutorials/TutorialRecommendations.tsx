"use client";

import Link from "next/link";
import { useEffect } from "react";

type TutorialRecommendation = {
  slug: string;
  title: string;
  excerpt: string;
  difficulty?: string;
};

export function TutorialRecommendations({
  tutorials,
}: {
  tutorials: TutorialRecommendation[];
}) {
  useEffect(() => {
    for (let i = 0; i < tutorials.length; i += 1) {
      const tutorial = tutorials[i];
      void fetch("/api/feed/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "recommendation_impression",
          postSlug: tutorial.slug,
          sourceContentType: "tutorial",
          targetContentType: "tutorial",
          position: i,
        }),
      }).catch(() => undefined);
    }
  }, [tutorials]);

  if (!tutorials.length) return null;

  const onClickRecommendation = async (slug: string, position: number) => {
    try {
      await fetch("/api/feed/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "recommendation_click",
          postSlug: slug,
          sourceContentType: "tutorial",
          targetContentType: "tutorial",
          position,
        }),
      });
    } catch {
      // no-op
    }
  };

  return (
    <section className="mt-10 rounded-xl border border-app bg-subtle p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-app">Next Learn</h2>
      <ul className="space-y-2">
        {tutorials.map((tutorial, idx) => (
          <li key={tutorial.slug}>
            <Link
              href={`/tutorials/${tutorial.slug}`}
              onClick={() => {
                void onClickRecommendation(tutorial.slug, idx);
              }}
              className="block rounded-lg border border-app bg-surface px-3 py-2 transition hover:border-sky-300"
            >
              <p className="text-sm font-semibold text-app">{tutorial.title}</p>
              <p className="mt-0.5 text-xs text-muted line-clamp-2">{tutorial.excerpt}</p>
              {tutorial.difficulty && (
                <p className="mt-1 text-[11px] text-indigo-700 capitalize">{tutorial.difficulty}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

