import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { findUserByEmail, resolveSignIn } from "./lib/auth/access";

/** Password-less email login for local testing only. Can never be enabled in a production build. */
export const devLoginEnabled = process.env.NODE_ENV === "development" && process.env.AUTH_DEV_LOGIN === "true";

const providers: Provider[] = [Google];

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        if (!email) return null;
        const user = await resolveSignIn({ email });
        return user ? { email: user.email, name: user.name, image: user.image } : null;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile, user }) {
      if (account?.provider === "google") {
        if (!profile?.email || profile.email_verified !== true) return false;
        return Boolean(await resolveSignIn({ email: profile.email, name: profile.name, image: user.image }));
      }
      // The dev provider already ran resolveSignIn in authorize().
      return account?.provider === "dev" && devLoginEnabled;
    },
    async jwt({ token, account, user }) {
      // On sign-in, store our database user id; role and status are re-checked on every admin request.
      if (account && user?.email) {
        const row = await findUserByEmail(user.email);
        token.uid = row?.id;
      }
      return token;
    },
  },
});
