import type { AskAiMode, AskSourceType } from "@/lib/askContext";

export type RankedPromptInput = {
  label: string;
  prompt: string;
  aiMode: AskAiMode;
};

export type RankedPrompt = RankedPromptInput & {
  score: number;
  tier: "primary" | "secondary";
};

const includesAny = (value: string, needles: string[]) => needles.some((needle) => value.includes(needle));

export function rankIntelligencePrompts({
  prompts,
  sourceType,
  page,
  context,
}: {
  prompts: RankedPromptInput[];
  sourceType: AskSourceType;
  page: string;
  context?: {
    risks?: string;
    tags?: string;
    discussions?: string;
    userIntent?: string;
  };
}): RankedPrompt[] {
  const riskText = `${context?.risks ?? ""} ${context?.tags ?? ""}`.toLowerCase();
  const discussionText = `${context?.discussions ?? ""}`.toLowerCase();
  const intentText = `${context?.userIntent ?? ""}`.toLowerCase();

  const ranked = prompts.map((item, idx) => {
    const text = `${item.label} ${item.prompt}`.toLowerCase();
    let score = 0;

    // Base mode relevance.
    if (sourceType === "siteJournal") {
      if (item.aiMode === "site_analyst") score += 1.5;
      if (item.aiMode === "planning_engineer") score += 1.2;
      if (includesAny(text, ["predict", "forecast", "mitigation", "impact"])) score += 1.2;
      if (includesAny(riskText, ["delay", "risk", "procurement", "vendor"])) score += 0.8;
    } else if (sourceType === "forum") {
      if (item.aiMode === "debate_synthesizer") score += 1.8;
      if (includesAny(text, ["consensus", "conflict", "strongest", "dispute", "contradiction"])) score += 1.4;
      if (discussionText.length > 40) score += 0.4;
    } else {
      if (item.aiMode === "planning_engineer" || item.aiMode === "site_analyst") score += 0.7;
      if (includesAny(text, ["checklist", "implement", "explain", "summarize", "actions"])) score += 1.1;
    }

    if (includesAny(intentText, ["forecast", "risk", "mitigation", "consensus", "checklist"])) score += 0.5;
    if (includesAny(page.toLowerCase(), ["conclusion", "late", "entry"])) score += includesAny(text, ["next", "plan", "forecast"]) ? 0.45 : 0;

    // Stable tie-breaker: preserve author ordering when scores are equal.
    score += Math.max(0, (prompts.length - idx) * 0.0001);
    return { ...item, score, tier: "secondary" as const };
  });

  ranked.sort((a, b) => b.score - a.score);
  const primaryCount = Math.min(2, ranked.length);
  return ranked.map((item, idx) => ({ ...item, tier: idx < primaryCount ? "primary" : "secondary" }));
}
