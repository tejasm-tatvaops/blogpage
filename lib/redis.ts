import Redis from "ioredis";
import { logger } from "@/lib/logger";

type RedisState = {
  client: Redis | null;
  disabled: boolean;
};

const state = globalThis as typeof globalThis & { __tatvaRedis?: RedisState };
if (!state.__tatvaRedis) {
  state.__tatvaRedis = { client: null, disabled: false };
}

const getRedisUrl = (): string | null => {
  const url = process.env.REDIS_URL?.trim();
  return url ? url : null;
};

export const getRedisClient = (): Redis | null => {
  // In dev, Redis connection churn during Fast Refresh can cause listener leaks
  // and unstable latency. Keep distributed cache disabled locally.
  if (process.env.NODE_ENV === "development") {
    state.__tatvaRedis = { client: null, disabled: true };
    return null;
  }
  if (state.__tatvaRedis?.disabled) return null;
  if (state.__tatvaRedis?.client) return state.__tatvaRedis.client;

  const url = getRedisUrl();
  if (!url) {
    state.__tatvaRedis = { client: null, disabled: true };
    return null;
  }

  try {
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", (error) => {
      logger.warn({ error }, "Redis client error");
    });
    state.__tatvaRedis = { client, disabled: false };
    return client;
  } catch (error) {
    logger.warn({ error }, "Failed to initialize Redis, using fallback cache");
    state.__tatvaRedis = { client: null, disabled: true };
    return null;
  }
};
