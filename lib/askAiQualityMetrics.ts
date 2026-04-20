type ConfidenceBand = "high" | "medium" | "low";

type AskAiQualitySample = {
  citationCompliant: boolean;
  correctedUncited: boolean;
  confidence: ConfidenceBand;
  conflictDetected: boolean;
  sourceMix: {
    tutorial: number;
    blog: number;
    forum: number;
    short: number;
  };
};

type AskAiQualityState = {
  total: number;
  citationCompliant: number;
  correctedUncited: number;
  confidence: Record<ConfidenceBand, number>;
  conflicts: number;
  sourceMix: {
    tutorial: number;
    blog: number;
    forum: number;
    short: number;
  };
};

const globalState = globalThis as typeof globalThis & {
  __tatvaopsAskAiQualityState?: AskAiQualityState;
};

const state: AskAiQualityState =
  globalState.__tatvaopsAskAiQualityState ?? {
    total: 0,
    citationCompliant: 0,
    correctedUncited: 0,
    confidence: { high: 0, medium: 0, low: 0 },
    conflicts: 0,
    sourceMix: { tutorial: 0, blog: 0, forum: 0, short: 0 },
  };

globalState.__tatvaopsAskAiQualityState = state;

export function recordAskAiQualitySample(sample: AskAiQualitySample): void {
  state.total += 1;
  if (sample.citationCompliant) state.citationCompliant += 1;
  if (sample.correctedUncited) state.correctedUncited += 1;
  state.confidence[sample.confidence] += 1;
  if (sample.conflictDetected) state.conflicts += 1;
  state.sourceMix.tutorial += sample.sourceMix.tutorial;
  state.sourceMix.blog += sample.sourceMix.blog;
  state.sourceMix.forum += sample.sourceMix.forum;
  state.sourceMix.short += sample.sourceMix.short;
}

export function getAskAiQualitySnapshot() {
  const total = Math.max(1, state.total);
  return {
    total_requests: state.total,
    citation_compliance_rate: state.citationCompliant / total,
    uncited_correction_rate: state.correctedUncited / total,
    confidence_distribution: {
      high: state.confidence.high / total,
      medium: state.confidence.medium / total,
      low: state.confidence.low / total,
    },
    conflict_detection_rate: state.conflicts / total,
    retrieval_source_mix_avg: {
      tutorial: state.sourceMix.tutorial / total,
      blog: state.sourceMix.blog / total,
      forum: state.sourceMix.forum / total,
      short: state.sourceMix.short / total,
    },
  };
}

