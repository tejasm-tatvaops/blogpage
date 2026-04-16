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

export const getNotificationRecipientKey = (request: Request): string => {
  const fp = getFingerprintFromRequest(request);
  if (fp) return `fp:${fp}`;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  return `ip:${ip}`;
};
