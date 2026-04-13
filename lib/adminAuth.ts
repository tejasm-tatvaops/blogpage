import { headers } from "next/headers";
import { redirect } from "next/navigation";

const getAdminSecret = (): string => process.env.ADMIN_BLOG_SECRET ?? "";

export const isAdminEnabled = (): boolean => process.env.ADMIN_BLOG_ENABLED === "true";

export const verifyAdminKey = (key?: string | null): boolean => {
  if (!isAdminEnabled()) {
    return false;
  }
  const secret = getAdminSecret();
  if (!secret) {
    return false;
  }
  return key === secret;
};

export const requireAdminPageAccess = (key?: string | null): void => {
  if (!verifyAdminKey(key)) {
    redirect("/blog");
  }
};

export const requireAdminApiAccess = async (): Promise<boolean> => {
  const h = await headers();
  const key = h.get("x-admin-key");
  return verifyAdminKey(key);
};
