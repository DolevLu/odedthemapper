import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/adminAlerts";
import { grantFreeWeek } from "@/lib/freeWeek";

// Google Sign-In is only registered once real credentials are supplied —
// next-auth errors at init if an OAuth provider is missing clientId/secret.
const providers: Provider[] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

providers.push(
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin };
    },
  })
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // 90 days instead of Auth.js's 30-day default — "log in once and stay
  // logged in" for a travel app people open sporadically over a whole trip,
  // not something they sign into daily.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: "/login" },
  // Required behind Vercel's proxy on a custom domain — without this Auth.js
  // won't trust the incoming Host header and every session/auth request 500s
  // with a "server configuration" error.
  trustHost: true,
  providers,
  // Fires for an OAuth (Google) signup only - the credentials provider's own registration route creates its User
  // row directly via prisma.user.create (see /api/register), bypassing the adapter entirely, so it notifies
  // admins itself instead of relying on this event.
  events: {
    async createUser({ user }) {
      if (user.id) await grantFreeWeek(user.id); // the free week starts at sign-up, once per network (lib/freeWeek.ts)
      await notifyAdmins({ title: "👤 חשבון חדש", body: `${user.name ?? user.email} נרשם/ה לטראבי (Google)`, url: "/admin/users" });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
