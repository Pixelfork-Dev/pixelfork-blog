import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; sv?: number } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    /** users.session_version at sign-in. */
    sv?: number;
  }
}
