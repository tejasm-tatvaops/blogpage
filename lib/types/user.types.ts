export type PublicIdentityType = "REAL" | "ANONYMOUS" | "SYSTEM";

export type IdentityProfileRef = {
  identity_key: string;
  username?: string | null;
  display_name?: string | null;
};

