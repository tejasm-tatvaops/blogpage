export const hasMinimumContentLength = (value: string, min: number): boolean =>
  String(value ?? "").trim().length >= min;

