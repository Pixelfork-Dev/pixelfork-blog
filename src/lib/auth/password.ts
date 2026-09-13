import "server-only";

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt (memory-hard, no native dependency).
 * Stored format: scrypt$N$r$p$<salt base64>$<hash base64>, so parameters can be raised later.
 */

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

function derive(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...options, maxmem: 128 * N * R * 2 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Spend the same time as a real check, so response timing doesn't reveal which emails have accounts. */
const DUMMY_HASH = hashPassword("pixelfork-timing-equalizer");
export async function burnPasswordCheck(password: string) {
  await verifyPassword(password, await DUMMY_HASH);
}

export function passwordProblem(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}
