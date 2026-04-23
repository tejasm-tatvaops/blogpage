import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthUserModel } from "@/models/User";
import { ensureUserProfileForIdentity } from "@/lib/userProfileService";

const buildUsernameFromEmail = (email: string): string => {
  const [local] = email.toLowerCase().split("@");
  const sanitized = (local ?? "member").replace(/[^a-z0-9._-]/g, "");
  return sanitized || "member";
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return true;
      try {
        await connectToDatabase();
        const email = user.email.toLowerCase();
        const dbUser = await AuthUserModel.findOneAndUpdate(
          { email },
          {
            $setOnInsert: {
              username: buildUsernameFromEmail(email),
              email,
              createdAt: new Date(),
            },
            $set: {
              name: user.name ?? "User",
              image: user.image ?? null,
            },
          },
          { upsert: true, new: true },
        );
        if (dbUser?._id) {
          await ensureUserProfileForIdentity({
            identityKey: `google:${dbUser._id.toString()}`,
            displayName:
              (typeof (dbUser as { username?: string }).username === "string" &&
                (dbUser as { username?: string }).username) ||
              dbUser.name ||
              user.name ||
              email,
            avatarSeed: dbUser._id.toString(),
          });
        }
      } catch (error) {
        console.error("signIn enrichment error", error);
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        name: (token.name as string) ?? null,
        email: (token.email as string) ?? null,
        image: (token.picture as string) ?? null,
      };
      return session;
    },
  },
  pages: { error: "/" },
  secret: process.env.NEXTAUTH_SECRET,
};
