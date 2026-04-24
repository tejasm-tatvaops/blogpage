export type IdentityUserType = "REAL" | "ANONYMOUS" | "SYSTEM";

export function getUserType(identityKey: string): IdentityUserType {
  const key = identityKey.trim();
  if (key.startsWith("google:")) return "REAL";
  if (key.startsWith("fp:") || key.startsWith("ip:")) return "ANONYMOUS";
  return "SYSTEM";
}

// Backward-compatible alias while we migrate call sites.
export const deriveUserType = getUserType;
