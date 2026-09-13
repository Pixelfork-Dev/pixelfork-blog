import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { basePath } from "./config/site";

const { auth } = NextAuth(authConfig);

/**
 * Optimistic gate for /admin: signed-out visitors go to the login page before anything renders.
 * Real authorization (role, deactivated accounts) happens server-side in src/lib/auth/dal.ts.
 */
export default auth((req) => {
  // Auth.js re-creates the request (with AUTH_URL's origin), so the path may or may not include the base path.
  const { pathname, origin } = req.nextUrl;
  const path = basePath && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
  if (!req.auth && path !== "/admin/login" && path !== "/admin/register") {
    return NextResponse.redirect(new URL(`${basePath}/admin/login`, origin));
  }
  // Signed-in visitors on /admin/login are handled by the page itself: a cookie alone doesn't prove
  // the account is still active, and bouncing it to /admin here would loop for deactivated users.
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
