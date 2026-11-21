import "server-only";
import { NextResponse } from "next/server";
import { auth0, isUwoEmail } from "./auth0";
import { db } from "./db";

export type SessionUser = { sub: string; email: string; name: string };

export async function currentUser(): Promise<SessionUser | null> {
  if (!auth0) return null;
  const user = (await auth0.getSession())?.user;
  if (!user?.sub || !isUwoEmail(user.email)) return null;
  return { sub: user.sub, email: user.email!, name: user.name ?? user.email!.split("@")[0] };
}

/** Common guard for account routes: DB configured + signed-in @uwo.ca user with a users row. */
export async function requireAccount() {
  const sql = db();
  if (!sql) return { error: NextResponse.json({ error: "db-unavailable", message: "Accounts aren't switched on yet." }, { status: 503 }) };
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "signed-out", message: "Sign in with your @uwo.ca account." }, { status: 401 }) };
  const [row] = await sql<{ id: string; handle: string | null }[]>`SELECT id, handle FROM users WHERE auth0_id = ${user.sub}`;
  return { sql, user, me: row ?? null };
}

/** Lowercase handle from a display name: a-z 0-9 . _ - , 3–20 chars. */
export function toHandle(name: string) {
  const h = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w .-]/g, "")
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 20);
  return h.length >= 3 ? h : `mustang${h}`.slice(0, 20);
}

export const isHandle = (h: unknown): h is string => typeof h === "string" && /^[a-z0-9._-]{3,24}$/.test(h);
