/**
 * Centralised environment variable validation.
 * Call validateEnv() once at server startup (e.g. inside connectToDatabase).
 * Exported helpers give typed, non-nullable access to every var.
 */

const REQUIRED = [
  "MONGODB_URI",
  "OPENAI_API_KEY",
  "ADMIN_BLOG_SECRET",
  "SESSION_SECRET",
  "NEXT_PUBLIC_SITE_URL",
] as const;

type RequiredKey = (typeof REQUIRED)[number];

let validated = false;

export function validateEnv(): void {
  if (validated) return;

  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Check your .env.local file.`,
    );
  }

  if ((process.env.SESSION_SECRET?.length ?? 0) < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    (process.env.NEXT_PUBLIC_SITE_URL ?? "").includes("localhost")
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL cannot be localhost in production.");
  }

  validated = true;
}

export function env(key: RequiredKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value;
}
