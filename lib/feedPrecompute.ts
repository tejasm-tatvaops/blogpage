import { logger } from "@/lib/logger";
import { getPersonaVector } from "@/lib/personaService";
import { buildFeed } from "@/lib/feedService";
import { assignFeedVariant } from "@/lib/feedExperiments";
import { feedCacheKey, setCachedFeed } from "@/lib/feedCache";

const PRECOMPUTE_INTERVAL_MS = 3 * 60 * 1000;
const HOT_IDENTITY_LIMIT = 500;

const precomputeState = globalThis as typeof globalThis & {
  __feedPrecomputeIdentities?: Set<string>;
  __feedPrecomputeTimer?: NodeJS.Timeout;
};

if (!precomputeState.__feedPrecomputeIdentities) {
  precomputeState.__feedPrecomputeIdentities = new Set<string>();
}

export const markFeedIdentityHot = (identityKey: string): void => {
  const set = precomputeState.__feedPrecomputeIdentities!;
  if (set.size >= HOT_IDENTITY_LIMIT && !set.has(identityKey)) {
    const first = set.values().next().value as string | undefined;
    if (first) set.delete(first);
  }
  set.add(identityKey);
};

const runOneCycle = async (): Promise<void> => {
  const identities = [...(precomputeState.__feedPrecomputeIdentities ?? [])].slice(0, HOT_IDENTITY_LIMIT);
  await Promise.allSettled(
    identities.map(async (identityKey) => {
      const personaVector = await getPersonaVector(identityKey, 30, true);
      const variant = assignFeedVariant(identityKey);
      const result = await buildFeed({
        personaVector,
        limit: 20,
        page: 1,
        scoringWeights: variant.weights,
      });
      await setCachedFeed(feedCacheKey(identityKey, 1, 20), result);
    }),
  );
};

export const runFeedPrecomputeNow = async (): Promise<void> => {
  await runOneCycle();
};

export const startFeedPrecomputeWorker = (): void => {
  if (process.env.NODE_ENV === "development") return;
  if (precomputeState.__feedPrecomputeTimer) return;
  precomputeState.__feedPrecomputeTimer = setInterval(() => {
    void runOneCycle().catch((error) => {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, "feed precompute cycle failed");
    });
  }, PRECOMPUTE_INTERVAL_MS);
};
