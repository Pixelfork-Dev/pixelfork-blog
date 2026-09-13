import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { findUserByEmail, verifySignIn } from "./lib/auth/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "password",
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password || password.length > 200) return null;
        const user = await verifySignIn(email, password);
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // On sign-in, store the database user id and session version; both are re-checked on every admin request.
      if (user?.email) {
        const row = await findUserByEmail(user.email);
        token.uid = row?.id;
        token.sv = row?.sessionVersion;
      }
      return token;
    },
  },
});
