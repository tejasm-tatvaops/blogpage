"use client";

import Link from "next/link";
import type { SiteJournalProject } from "@/data/siteJournals";

export function RelatedSiteJournalsCard({ journals }: { journals: SiteJournalProject[] }) {
  if (!journals.length) return null;
  return (
    <section className="rounded-2xl border border-app bg-surface p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Related Site Journals</h3>
      <p className="mt-2 text-xs text-muted">
        This discussion appears in connected execution timelines and field notes.
      </p>
      <div className="mt-3 space-y-2">
        {journals.map((journal) => (
          <Link
            key={journal.id}
            href={`/projects/${journal.slug}`}
            className="block rounded-xl border border-app bg-subtle px-3 py-2 transition hover:bg-white"
          >
            <p className="text-sm font-semibold text-app">{journal.title}</p>
            <p className="mt-0.5 text-xs text-muted">
              {journal.city}, {journal.region} - Week {journal.timeline.week} - {journal.timeline.stage}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
