import Link from "next/link";

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
  topicHubs?: Item[];
};

function SectionList({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) return null;
  const isTopicHubs = title === "Topic hubs";
  return (
    <section className={`rounded-xl border border-app bg-surface p-4 ${isTopicHubs ? "lg:col-span-2" : ""}`}>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      <ul className={isTopicHubs ? "mt-3 grid grid-cols-2 gap-2.5" : "mt-3 space-y-2.5"}>
        {items.map((item) => (
          <li key={`${title}:${item.href}`}>
            <Link
              href={item.href}
              className={`group block rounded-lg border border-app bg-subtle px-3 py-2 transition hover:border-sky-300 hover:bg-sky-50 ${
                isTopicHubs ? "h-full" : ""
              }`}
            >
              <p className="text-sm font-semibold text-app transition group-hover:text-sky-700 line-clamp-2">
                {item.title}
              </p>
              {item.subtitle && <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{item.subtitle}</p>}
              {item.reason && (
                <span className="mt-1 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                  {item.reason}
                </span>
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
  topicHubs = [],
}: Props) {
  const confidenceTone =
    confidence === "high"
      ? "bg-emerald-100 text-emerald-700"
      : confidence === "low"
        ? "bg-amber-100 text-amber-700"
        : "bg-sky-100 text-sky-700";

  return (
    <section className="mt-10 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          Knowledge Ecosystem
        </span>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${confidenceTone}`}>
          Confidence {confidence}
        </span>
        <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">
          {freshnessLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-app">Connected knowledge for {topicLabel}</h2>
          <p className="text-sm text-slate-600">Move between tutorials, discussions, shorts, and hubs without losing context.</p>
        </div>
        {askAiHref && (
          <Link
            href={askAiHref}
            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Ask AI about this topic
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionList title="Next learn" items={nextLearn} />
        <SectionList title="Related discussions" items={relatedDiscussions} />
        <SectionList title="Related shorts" items={relatedShorts} />
        <SectionList title="Topic hubs" items={topicHubs} />
      </div>
    </section>
  );
}

