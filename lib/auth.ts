import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthUserModel } from "@/models/User";

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
      if (!user.email) return false;
      try {
        await connectToDatabase();
        await AuthUserModel.findOneAndUpdate(
          { email: user.email },
          {
            $setOnInsert: {
              name: user.name ?? "User",
              email: user.email,
              image: user.image ?? null,
              createdAt: new Date(),
            },
          },
          { upsert: true },
        );
      } catch {
        return false;
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
