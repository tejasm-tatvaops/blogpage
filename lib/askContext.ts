export type AskAiMode =
  | "site_analyst"
  | "cost_strategist"
  | "planning_engineer"
  | "safety_auditor"
  | "debate_synthesizer";

export type AskSourceType = "blog" | "siteJournal" | "forum";

export type AskContextParams = {
  prompt: string;
  anchor: string;
  sourceType: AskSourceType;
  aiMode: AskAiMode;
  page: string;
  intent?: string;
  journal?: string;
  week?: string;
  city?: string;
  risks?: string;
  tags?: string;
  discussions?: string;
  expertise?: string;
};

export function buildAskHref(params: AskContextParams): string {
  const query = new URLSearchParams({
    prompt: params.prompt,
    anchor: params.anchor,
    sourceType: params.sourceType,
    aiMode: params.aiMode,
    page: params.page,
    intent: params.intent ?? params.prompt,
    journal: params.journal ?? "",
    week: params.week ?? "",
    city: params.city ?? "",
    risks: params.risks ?? "",
    tags: params.tags ?? "",
    discussions: params.discussions ?? "",
    expertise: params.expertise ?? "",
  });
  return `/ask?${query.toString()}`;
}
