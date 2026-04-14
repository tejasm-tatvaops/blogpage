import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  adminAuthenticated?: boolean;
};

const SESSION_COOKIE = "tatvaops_session";

function getSessionOptions() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long.");
  }
  return {
    password,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    },
  };
}

export const getSession = async () => {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
};
