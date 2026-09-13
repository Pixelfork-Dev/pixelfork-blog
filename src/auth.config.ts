import type { NextAuthConfig } from "next-auth";
import { basePath } from "./config/site";

/**
 * Auth settings shared by the proxy and the full Auth.js instance.
 * Must stay free of database imports: the proxy only decodes the session cookie.
 */
export const authConfig = {
  // Auth.js doesn't know about Next's basePath: its endpoints and pages need the full path.
  basePath: `${basePath}/api/auth`,
  pages: { signIn: `${basePath}/admin/login`, error: `${basePath}/admin/login` },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user && typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
} satisfies NextAuthConfig;
