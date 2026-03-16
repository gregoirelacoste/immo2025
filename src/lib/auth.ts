import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getUserByEmail, getUserById, upsertOAuthUser } from "@/domains/auth/repository";
import type { Provider } from "next-auth/providers";

// Build providers list dynamically — only add Google if configured
const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string;
      const password = credentials?.password as string;
      if (!email || !password) return null;

      const user = await getUserByEmail(email);
      if (!user || !user.password_hash) return null;

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

// Only add Google provider if both client ID and secret are set
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || "dev-secret-local-only",
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const dbUser = await upsertOAuthUser({
          email: user.email,
          name: user.name || "",
          image: user.image || "",
        });
        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Fetch role from DB on sign-in
        const dbUser = await getUserById(user.id as string);
        token.role = dbUser?.role || "user";
      }
      // Refresh role periodically (on session update)
      if (trigger === "update" && token.id) {
        const dbUser = await getUserById(token.id as string);
        token.role = dbUser?.role || "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (token.role) {
        (session.user as unknown as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
});
