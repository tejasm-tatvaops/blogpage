const FP_COOKIE = "tatvaops_fp";

/**
 * Extracts the browser fingerprint from the request cookie.
 * Returns null if no fingerprint cookie is present.
 */
export const getFingerprintFromRequest = (request: Request): string | null => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${FP_COOKIE}=([^;]+)`));
  return match?.[1]?.trim() ?? null;
};
