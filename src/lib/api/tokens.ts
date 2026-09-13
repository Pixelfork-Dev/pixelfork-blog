import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gte, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import type { ApiTokenRow } from "@/db/schema";

/**
 * Publishing API tokens. Tokens are 256-bit random strings, so a plain SHA-256 hash is enough to
 * store them safely (no password-style stretching needed). Each request re-checks revocation.
 */

export const API_SCOPES = {
  "drafts:create": "Create draft posts and upload their images",
  "covers:update": "Replace the cover image of existing posts",
} as const;
export type ApiScope = keyof typeof API_SCOPES;

/** Daily limits per token, so a leaked or runaway token can't flood the blog. */
export const DAILY_LIMITS = { media: 60, posts: 5 };

const PREFIX = "pfb_";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export function generateToken() {
  const token = PREFIX + randomBytes(32).toString("base64url");
  return { token, tokenHash: hash(token), prefix: token.slice(0, PREFIX.length + 6) };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Resolves the bearer token and checks its scope; throws ApiError(401/403) otherwise. */
export async function authenticate(request: Request, scope: ApiScope | ApiScope[]): Promise<ApiTokenRow> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(PREFIX) || token.length > 100) throw new ApiError(401, "Missing or invalid API token.");

  const row = await db.query.apiTokens.findFirst({
    where: and(eq(schema.apiTokens.tokenHash, hash(token)), isNull(schema.apiTokens.revokedAt)),
  });
  if (!row) throw new ApiError(401, "Missing or invalid API token.");

  const needed = Array.isArray(scope) ? scope : [scope];
  if (!needed.some((s) => row.scopes.includes(s))) throw new ApiError(403, `This token needs the ${needed.join(" or ")} scope.`);

  await db.update(schema.apiTokens).set({ lastUsedAt: new Date() }).where(eq(schema.apiTokens.id, row.id));
  return row;
}

export async function assertDailyLimit(tokenId: string, kind: keyof typeof DAILY_LIMITS) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ value }] =
    kind === "media"
      ? await db.select({ value: count() }).from(schema.media).where(and(eq(schema.media.uploadedByTokenId, tokenId), gte(schema.media.createdAt, since)))
      : await db.select({ value: count() }).from(schema.posts).where(and(eq(schema.posts.createdByTokenId, tokenId), gte(schema.posts.createdAt, since)));
  if (value >= DAILY_LIMITS[kind]) throw new ApiError(429, `Daily limit reached (${DAILY_LIMITS[kind]} ${kind} per 24 hours).`);
}

/** Wraps a route handler: turns ApiError into JSON responses and hides unexpected errors. */
export function apiRoute<Ctx>(handler: (request: Request, ctx: Ctx) => Promise<Response>) {
  return async (request: Request, ctx: Ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error(error);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}
