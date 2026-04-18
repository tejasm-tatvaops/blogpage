"use client";

export type TopicState = "interested" | "uninterested" | null;
export type PreferenceMap = Record<string, TopicState>;

type Props = {
  topics: string[];
  preferences: PreferenceMap;
  onChange: (topic: string, next: TopicState) => void;
};

export function TopicPreferenceSelector({ topics, preferences, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {topics.map((topic) => {
        const state = preferences[topic] ?? null;
        const isInterested = state === "interested";
        const isUninterested = state === "uninterested";

        const baseChip =
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 select-none";
        const chipStyle = isInterested
          ? `${baseChip} border-emerald-300 bg-emerald-50 text-emerald-800`
          : isUninterested
          ? `${baseChip} border-rose-300 bg-rose-50 text-rose-700`
          : `${baseChip} border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100`;

        return (
          <div key={topic} className={chipStyle}>
            <span className="leading-none">{topic}</span>
            <span className="ml-0.5 flex items-center gap-1">
              <button
                type="button"
                aria-label={`Interested in ${topic}`}
                title="Interested"
                onClick={() => onChange(topic, isInterested ? null : "interested")}
                className={`rounded-full p-0.5 transition-colors ${
                  isInterested
                    ? "text-emerald-600"
                    : "text-slate-400 hover:text-emerald-500"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 9V14H2.5A1.5 1.5 0 011 12.5v-2A1.5 1.5 0 012.5 9H4zm1 5V8.5l2.5-5A1.5 1.5 0 019 5v1.5h3.5A1.5 1.5 0 0114 8.09l-1 5A1.5 1.5 0 0111.5 14H5z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label={`Not interested in ${topic}`}
                title="Not interested"
                onClick={() => onChange(topic, isUninterested ? null : "uninterested")}
                className={`rounded-full p-0.5 transition-colors ${
                  isUninterested
                    ? "text-rose-500"
                    : "text-slate-400 hover:text-rose-400"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 7V2H13.5A1.5 1.5 0 0115 3.5v2A1.5 1.5 0 0113.5 7H12zm-1-5V7.5l-2.5 5A1.5 1.5 0 017 11v-1.5H3.5A1.5 1.5 0 012 7.91l1-5A1.5 1.5 0 014.5 2H11z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
