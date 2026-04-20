import { logger } from "@/lib/logger";

export type MetricFields = Record<string, string | number | boolean | null | undefined>;

/**
 * Lightweight structured metric emitter.
 * Uses normal logger pipeline so we can aggregate by `metric_name` in log tooling.
 */
export function recordMetric(metricName: string, fields: MetricFields = {}): void {
  logger.info(
    {
      metric_name: metricName,
      ...fields,
    },
    "metric",
  );
}

