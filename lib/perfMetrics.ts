type PerfSeries = {
  samples: number[];
  baselineP50: number | null;
  baselineP95: number | null;
};

const MAX_SAMPLES = 240;

const perfState = globalThis as typeof globalThis & {
  __tatvaopsPerfSeries?: Map<string, PerfSeries>;
};

if (!perfState.__tatvaopsPerfSeries) {
  perfState.__tatvaopsPerfSeries = new Map<string, PerfSeries>();
}

const getSeries = (key: string): PerfSeries => {
  const series = perfState.__tatvaopsPerfSeries!.get(key);
  if (series) return series;
  const created: PerfSeries = { samples: [], baselineP50: null, baselineP95: null };
  perfState.__tatvaopsPerfSeries!.set(key, created);
  return created;
};

const percentile = (samples: number[], p: number): number => {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
};

export const recordLatency = (key: string, durationMs: number): void => {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  const series = getSeries(key);
  series.samples.push(durationMs);
  if (series.samples.length > MAX_SAMPLES) series.samples.shift();

  if (series.samples.length >= 20 && series.baselineP50 === null) {
    series.baselineP50 = percentile(series.samples, 50);
    series.baselineP95 = percentile(series.samples, 95);
  }
};

export const getLatencyStats = (
  key: string,
): {
  count: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  baseline_p50: number | null;
  baseline_p95: number | null;
} => {
  const series = getSeries(key);
  const count = series.samples.length;
  const sum = series.samples.reduce((acc, value) => acc + value, 0);
  return {
    count,
    p50: percentile(series.samples, 50),
    p95: percentile(series.samples, 95),
    p99: percentile(series.samples, 99),
    avg: count > 0 ? sum / count : 0,
    baseline_p50: series.baselineP50,
    baseline_p95: series.baselineP95,
  };
};
