import { brandProfile } from "@/data/brandProfileMock";

type ScoreItem = {
  label: string;
  score: number;
  color: string;
  trackColor: string;
};

const scores: ScoreItem[] = [
  {
    label: "Product Quality Score",
    score: brandProfile.trustScores.productQuality,
    color: "bg-sky-500",
    trackColor: "bg-sky-100 dark:bg-sky-900/30",
  },
  {
    label: "Market Reliability",
    score: brandProfile.trustScores.marketReliability,
    color: "bg-violet-500",
    trackColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  {
    label: "Certification Score",
    score: brandProfile.trustScores.certificationScore,
    color: "bg-emerald-500",
    trackColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    label: "Customer Satisfaction",
    score: brandProfile.trustScores.customerSatisfaction,
    color: "bg-amber-500",
    trackColor: "bg-amber-100 dark:bg-amber-900/30",
  },
];

function getScoreLabel(score: number) {
  if (score >= 95) return { text: "Exceptional", cls: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 85) return { text: "Excellent", cls: "text-sky-600 dark:text-sky-400" };
  if (score >= 75) return { text: "Good", cls: "text-amber-600 dark:text-amber-400" };
  return { text: "Fair", cls: "text-slate-500 dark:text-slate-400" };
}

export default function BrandTrust() {
  const overall = Math.round(
    Object.values(brandProfile.trustScores).reduce((a, b) => a + b, 0) /
      Object.values(brandProfile.trustScores).length
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Brand Trust
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">Quality and reliability indicators</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-black text-sky-600 dark:text-sky-400">{overall}</span>
          <span className="text-sm text-slate-400">/ 100</span>
          <span className="ml-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Overall</span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {scores.map((item) => {
          const badge = getScoreLabel(item.score);
          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold ${badge.cls}`}>{badge.text}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.score}</span>
                </div>
              </div>
              <div className={`h-2 w-full overflow-hidden rounded-full ${item.trackColor}`}>
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-700`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
