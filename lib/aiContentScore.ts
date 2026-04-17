type ContentScoreBreakdown = {
  clarity: number;
  structure: number;
  logic: number;
  originality: number;
  informationDensity: number;
  lengthNormalization: number;
  argumentFlow: number;
  genericPenalty: number;
  penalties: number;
  finalScore: number;
};

type QualityContext = {
  commentDepthBoost?: number;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const sentenceCount = (text: string): number =>
  text
    .split(/[.!?]+\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;

const wordCount = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const uniqueWordRatio = (text: string): number => {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
};

const hasStructuredMarkers = (text: string): boolean =>
  /(first|second|third|because|therefore|however|for example|in practice|recommend|step \d+)/i.test(text);

const repeatedPhrasePenalty = (text: string): number => {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const segments = normalized.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  if (segments.length < 3) return 0;
  const freq = new Map<string, number>();
  for (const segment of segments) {
    const key = segment.slice(0, 80);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  const maxDup = Math.max(...freq.values());
  return maxDup >= 3 ? 0.18 : maxDup === 2 ? 0.08 : 0;
};

const genericFluffPenalty = (text: string): number =>
  /(in today's world|it is important to note|overall,|in conclusion|this highlights the importance)/i.test(text)
    ? 0.08
    : 0;

const sentenceIdeaDensity = (text: string): number => {
  const sentences = text.split(/[.!?]+\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return 0;
  const ideaSignals = /(because|therefore|however|if|then|tradeoff|risk|cost|timeline|mitigation|step|option|constraint)/gi;
  const ideaCount = sentences.reduce((acc, sentence) => acc + (sentence.match(ideaSignals)?.length ?? 0), 0);
  return clamp01((ideaCount / sentences.length) / 1.25);
};

const diminishingLengthFactor = (words: number, informationDensity: number): number => {
  if (words <= 320) return 1;
  const excess = words - 320;
  const rawDecay = 1 / (1 + excess / 420);
  const qualityCompensation = 0.65 + informationDensity * 0.35;
  return clamp01(rawDecay * qualityCompensation);
};

const argumentFlowScore = (text: string): number => {
  const markers = [
    /first|second|third|finally/gi,
    /because|therefore|hence|as a result/gi,
    /if .* then|otherwise/gi,
    /step\s*\d+|^\d+\./gim,
  ];
  const hits = markers.reduce((acc, rx) => acc + (text.match(rx)?.length ?? 0), 0);
  return clamp01(hits / 6);
};

const genericAdvicePenalty = (text: string): number => {
  const genericPatterns = [
    /best practices|leverage|synergy|unlock potential|game changer/gi,
    /always remember|never forget|it depends but/gi,
    /focus on quality and consistency/gi,
    /this can help improve outcomes/gi,
  ];
  const hits = genericPatterns.reduce((acc, rx) => acc + (text.match(rx)?.length ?? 0), 0);
  return Math.min(0.22, hits * 0.05);
};

export const getContentQualityScoreBreakdown = (
  postText: string,
  context: QualityContext = {},
): ContentScoreBreakdown => {
  const safe = postText.trim();
  if (!safe) {
    return {
      clarity: 0,
      structure: 0,
      logic: 0,
      originality: 0,
      informationDensity: 0,
      lengthNormalization: 0,
      argumentFlow: 0,
      genericPenalty: 0,
      penalties: 0,
      finalScore: 0,
    };
  }

  const words = wordCount(safe);
  const sentences = sentenceCount(safe);
  const avgSentenceLength = sentences > 0 ? words / sentences : words;
  const readabilityBalance =
    avgSentenceLength >= 8 && avgSentenceLength <= 28
      ? 1
      : avgSentenceLength > 45
        ? 0.45
        : 0.7;

  const clarity = clamp01(
    0.5 * readabilityBalance +
    0.3 * clamp01(words / 180) +
    0.2 * clamp01(sentences / 7),
  );

  const structure = clamp01(
    (hasStructuredMarkers(safe) ? 0.55 : 0.25) +
    0.25 * clamp01(sentences / 8) +
    0.2 * clamp01((safe.match(/\n/g)?.length ?? 0) / 6),
  );

  const logic = clamp01(
    0.45 * (/(because|therefore|hence|so that|as a result)/i.test(safe) ? 1 : 0.4) +
    0.3 * (/(if|then|risk|tradeoff|assumption)/i.test(safe) ? 1 : 0.5) +
    0.25 * clamp01(words / 220),
  );

  const originality = clamp01(
    0.6 * uniqueWordRatio(safe) +
    0.25 * (/(site|boq|contractor|procurement|estimate|material|timeline|budget)/i.test(safe) ? 1 : 0.55) +
    0.15 * clamp01(sentences / 9),
  );
  const informationDensity = sentenceIdeaDensity(safe);
  const lengthNormalization = diminishingLengthFactor(words, informationDensity);
  const argumentFlow = argumentFlowScore(safe);

  const emptyLongPenalty = words > 450 && logic < 0.55 ? 0.16 : 0;
  const repetitivePenalty = repeatedPhrasePenalty(safe);
  const fluffPenalty = genericFluffPenalty(safe);
  const genericPenalty = genericAdvicePenalty(safe);
  const penalties = Math.min(0.55, emptyLongPenalty + repetitivePenalty + fluffPenalty + genericPenalty);

  const blended =
    0.2 * clarity +
    0.16 * structure +
    0.2 * logic +
    0.14 * originality +
    0.16 * informationDensity +
    0.08 * lengthNormalization +
    0.06 * argumentFlow;
  const commentDepthBoost = clamp01(context.commentDepthBoost ?? 0) * 0.08;
  const finalScore = clamp01(blended * lengthNormalization - penalties + commentDepthBoost);

  return {
    clarity,
    structure,
    logic,
    originality,
    informationDensity,
    lengthNormalization,
    argumentFlow,
    genericPenalty,
    penalties,
    finalScore,
  };
};

export const getContentQualityScore = (postText: string, context: QualityContext = {}): number =>
  getContentQualityScoreBreakdown(postText, context).finalScore;
