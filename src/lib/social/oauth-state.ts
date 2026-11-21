import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * CSRF protection for the OAuth round trip: a random value stored in a
 * short-lived httpOnly cookie must come back unchanged in ?state=.
 */
const COOKIE = "spi_oauth_state";

export async function createState(provider: string): Promise<string> {
  const state = `${provider}.${randomBytes(24).toString("base64url")}`;
  (await cookies()).set(COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return state;
}

export async function verifyState(provider: string, returned: string | null): Promise<boolean> {
  const jar = await cookies();
  const expected = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  if (!expected || !returned || !expected.startsWith(`${provider}.`)) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(returned);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
