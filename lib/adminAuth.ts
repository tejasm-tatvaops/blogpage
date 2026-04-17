import { timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { getSession } from "./session";

export const isAdminEnabled = (): boolean => process.env.ADMIN_BLOG_ENABLED === "true";

/**
 * Verify a raw key string against the stored secret using a constant-time
 * comparison to prevent timing attacks.
 */
export const verifyAdminKey = (key?: string | null): boolean => {
  if (!isAdminEnabled()) return false;

  const secret = process.env.ADMIN_BLOG_SECRET ?? "";
  if (!secret || !key) return false;

  // Lengths must match first (timingSafeEqual requires same-length buffers)
  if (key.length !== secret.length) return false;

  return timingSafeEqual(Buffer.from(key), Buffer.from(secret));
};

/**
 * Server-side page guard. Checks the iron-session cookie.
 * Call at the top of every admin Server Component.
 */
export const requireAdminPageAccess = async (): Promise<void> => {
  if (!isAdminEnabled()) {
    redirect("/blog");
  }
  const session = await getSession();
  if (!session.adminAuthenticated) {
    redirect("/admin/login");
  }
};

/**
 * API route guard. Returns true when the request carries a valid session.
 */
export const requireAdminApiAccess = async (): Promise<boolean> => {
  if (!isAdminEnabled()) return false;
  const session = await getSession();
  return session.adminAuthenticated === true;
};

/**
 * Read-only admin session check for conditional UI.
 * Does not redirect; safe for public pages that optionally show admin controls.
 */
export const hasAdminSession = async (): Promise<boolean> => {
  if (!isAdminEnabled()) return false;
  const session = await getSession();
  return session.adminAuthenticated === true;
};
