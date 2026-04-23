export type IdentityUserType = "REAL" | "ANONYMOUS" | "AI";

export function deriveUserType(identityKey: string): IdentityUserType {
  const key = identityKey.trim();
  if (key.startsWith("google:")) return "REAL";
  if (key.startsWith("fp:") || key.startsWith("ip:")) return "ANONYMOUS";
  return "AI";
}
