import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { getIdentityKeyFromRequest } from "@/lib/fingerprint";

export async function getIdentityKeyFromSessionOrRequest(request: Request): Promise<string> {
  let source: "session" | "token" | "anonymous" = "anonymous";
  let sessionEmail: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id?.trim();
    sessionEmail = session?.user?.email?.trim() ?? null;
    if (sessionUserId) {
      source = "session";
      if (process.env.NODE_ENV === "development") {
        console.log("IDENTITY RESOLUTION", { source, sessionId: sessionUserId, tokenId: null, final: `google:${sessionUserId}` });
      }
      return `google:${sessionUserId}`;
    }
  } catch {
    // Fail open to anonymous identity fallback.
  }

  // Second-pass fallback: read JWT token directly from request cookies.
  // This reduces occasional null-session windows in route handlers.
  try {
    const token = await getToken({
      req: {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      } as never,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const tokenUserId = String((token as { id?: string; sub?: string } | null)?.id ?? "").trim()
      || String((token as { id?: string; sub?: string } | null)?.sub ?? "").trim();
    if (tokenUserId) {
      source = "token";
      if (process.env.NODE_ENV === "development") {
        console.log("IDENTITY RESOLUTION", { source, sessionId: null, tokenId: tokenUserId, final: `google:${tokenUserId}` });
      }
      return `google:${tokenUserId}`;
    }
    const tokenEmail = String((token as { email?: string } | null)?.email ?? "").trim();
    if (!sessionEmail && tokenEmail) {
      sessionEmail = tokenEmail;
    }
  } catch {
    // Keep anonymous fallback.
  }

  if (sessionEmail) {
    // Authenticated user lost their ID — writes will land on an anonymous identity.
    // This is a data integrity risk; investigate session/token configuration.
    console.error("Identity fallback: authenticated session has no user ID", { email: sessionEmail, source });
  }

  const anonymousIdentity = getIdentityKeyFromRequest(request);
  return anonymousIdentity;
}
