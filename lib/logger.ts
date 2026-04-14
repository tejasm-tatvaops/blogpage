import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  // Keep logger worker-free inside Next runtime to avoid intermittent
  // "vendor-chunks/lib/worker.js" module resolution crashes in dev.
  base: {
    env: process.env.NODE_ENV,
    service: "tatvaops-blog",
  },
});
