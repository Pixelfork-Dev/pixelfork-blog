import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Optimistic gate for /admin: signed-out visitors go to the login page before anything renders.
 * Real authorization (role, deactivated accounts) happens server-side in src/lib/auth/dal.ts.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  if (!req.auth && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }
  // Signed-in visitors on /admin/login are handled by the page itself: a cookie alone doesn't prove
  // the account is still active, and bouncing it to /admin here would loop for deactivated users.
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
