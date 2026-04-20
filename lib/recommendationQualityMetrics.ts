type RecommendationSample = {
  scope: "blog" | "tutorial";
  candidateCount: number;
  selectedCount: number;
  behavioralInfluenceAvg: number;
  freshnessInfluenceAvg: number;
  diversityUniquePrimaryTags: number;
};

type RecommendationState = {
  total: number;
  byScope: Record<"blog" | "tutorial", number>;
  candidateTotal: number;
  selectedTotal: number;
  behavioralInfluenceTotal: number;
  freshnessInfluenceTotal: number;
  diversityUniqueTagsTotal: number;
};

const globalState = globalThis as typeof globalThis & {
  __tatvaopsRecommendationQualityState?: RecommendationState;
};

const state: RecommendationState =
  globalState.__tatvaopsRecommendationQualityState ?? {
    total: 0,
    byScope: { blog: 0, tutorial: 0 },
    candidateTotal: 0,
    selectedTotal: 0,
    behavioralInfluenceTotal: 0,
    freshnessInfluenceTotal: 0,
    diversityUniqueTagsTotal: 0,
  };

globalState.__tatvaopsRecommendationQualityState = state;

export function recordRecommendationQualitySample(sample: RecommendationSample): void {
  state.total += 1;
  state.byScope[sample.scope] += 1;
  state.candidateTotal += sample.candidateCount;
  state.selectedTotal += sample.selectedCount;
  state.behavioralInfluenceTotal += sample.behavioralInfluenceAvg;
  state.freshnessInfluenceTotal += sample.freshnessInfluenceAvg;
  state.diversityUniqueTagsTotal += sample.diversityUniquePrimaryTags;
}

export function getRecommendationQualitySnapshot() {
  const total = Math.max(1, state.total);
  return {
    ranking_runs: state.total,
    by_scope: state.byScope,
    avg_candidate_count: state.candidateTotal / total,
    avg_selected_count: state.selectedTotal / total,
    avg_behavioral_influence: state.behavioralInfluenceTotal / total,
    avg_freshness_influence: state.freshnessInfluenceTotal / total,
    avg_diversity_unique_primary_tags: state.diversityUniqueTagsTotal / total,
  };
}

