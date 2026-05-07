import Link from "next/link";
import { ContextChip } from "@/components/shared/ContextChip";

type Item = {
  title: string;
  href: string;
  subtitle?: string;
  reason?: string;
};

type Props = {
  topicLabel: string;
  confidence?: "high" | "medium" | "low";
  freshnessLabel?: string;
  askAiHref?: string;
  nextLearn?: Item[];
  relatedDiscussions?: Item[];
  relatedShorts?: Item[];
  relatedSiteJournals?: Item[];
  topicHubs?: Item[];
};

function SectionList({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) return null;
  const isTopicHubs = title === "Topic hubs";
  return (
    <section className={`rounded-xl border border-app bg-surface p-4 ${isTopicHubs ? "lg:col-span-2" : ""}`}>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</h3>
      <ul className={isTopicHubs ? "mt-3 grid grid-cols-2 gap-2.5" : "mt-3 space-y-2.5"}>
        {items.map((item) => (
          <li key={`${title}:${item.href}`}>
            <Link
              href={item.href}
              className={`group block rounded-lg border border-app bg-subtle px-3 py-2 transition hover:border-orange-200 hover:bg-orange-50/40 ${
                isTopicHubs ? "h-full" : ""
              }`}
            >
              <p className="text-sm font-semibold text-app transition group-hover:text-app line-clamp-2">
                {item.title}
              </p>
              {item.subtitle && <p className="mt-0.5 text-xs text-muted line-clamp-1">{item.subtitle}</p>}
              {item.reason && (
                <div className="mt-1">
                  <ContextChip
                    text={item.reason}
                    keyword={item.title.split(" ").slice(0, 1).join(" ")}
                    className="border-orange-200/50 bg-orange-50/60 text-orange-700 hover:text-orange-800"
                  />
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KnowledgeEcosystemPanel({
  topicLabel,
  confidence = "medium",
  freshnessLabel = "Recently updated",
  askAiHref,
  nextLearn = [],
  relatedDiscussions = [],
  relatedShorts = [],
  relatedSiteJournals = [],
  topicHubs = [],
}: Props) {
  const confidenceTone =
    confidence === "high"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : confidence === "low"
        ? "bg-amber-50 text-amber-700 border border-amber-200"
        : "bg-orange-50 text-orange-700 border border-orange-200";

  return (
    <section className="mt-10 rounded-2xl border border-app bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-app bg-subtle px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-app">
          Knowledge Ecosystem
        </span>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${confidenceTone}`}>
          Confidence {confidence}
        </span>
        <span className="inline-flex rounded-full border border-app bg-subtle px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {freshnessLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-app">Connected knowledge for {topicLabel}</h2>
          <p className="text-sm text-muted">Move between tutorials, discussions, shorts, and hubs without losing context.</p>
        </div>
        {askAiHref && (
          <Link
            href={askAiHref}
            className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            Ask AI about this topic
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionList title="Next learn" items={nextLearn} />
        <SectionList title="Related discussions" items={relatedDiscussions} />
        <SectionList title="Related shorts" items={relatedShorts} />
        <SectionList title="Related site journals" items={relatedSiteJournals} />
        <SectionList title="Topic hubs" items={topicHubs} />
      </div>
    </section>
  );
}

