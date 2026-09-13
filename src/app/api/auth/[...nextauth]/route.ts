import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { basePath } from "@/config/site";

/**
 * Auth.js parses the action from the full request path ("/blog/api/auth/callback/google"), but in
 * production builds Next hands route handlers the path without the base path. Put it back.
 */
function withBasePath(handler: (req: NextRequest) => Promise<Response>) {
  return (req: NextRequest) => {
    const url = new URL(req.url);
    if (!basePath || url.pathname.startsWith(`${basePath}/`)) return handler(req);
    url.pathname = `${basePath}${url.pathname}`;
    return handler(new NextRequest(url, req));
  };
}

export const GET = withBasePath(handlers.GET);
export const POST = withBasePath(handlers.POST);
