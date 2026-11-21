import { NextResponse } from "next/server";
import { isHandle, requireAccount } from "@/lib/session";

export type FriendRow = {
  handle: string;
  name: string;
  faculty: string | null;
  year: string | null;
  emblem: string;
  accent: string;
  rep: number;
  cells: number;
  missions: number;
};

const COLS = `u.handle, u.display_name AS name, u.faculty, u.year, u.emblem, u.accent, u.rep,
  u.explored_cells AS cells, u.mission_count AS missions`;

/** Accepted friends + pending requests (incoming and outgoing). */
export async function GET() {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  if (!me) return NextResponse.json({ friends: [], incoming: [], outgoing: [] });

  const rows = await sql.unsafe<(FriendRow & { kind: string })[]>(
    `SELECT 'friend' AS kind, ${COLS} FROM friendships f JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = $1 AND f.status = 'accepted'
     UNION ALL
     SELECT 'incoming', ${COLS} FROM friendships f JOIN users u ON u.id = f.user_id
       WHERE f.friend_id = $1 AND f.status = 'pending'
     UNION ALL
     SELECT 'outgoing', ${COLS} FROM friendships f JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = $1 AND f.status = 'pending'
     ORDER BY rep DESC`,
    [me.id],
  );
  const pick = (k: string): FriendRow[] =>
    rows.filter((r) => r.kind === k).map((r) => ({ handle: r.handle, name: r.name, faculty: r.faculty, year: r.year, emblem: r.emblem, accent: r.accent, rep: r.rep, cells: r.cells, missions: r.missions }));
  return NextResponse.json({ friends: pick("friend"), incoming: pick("incoming"), outgoing: pick("outgoing") });
}

/** Send a request by handle (or accept theirs if they already asked). */
export async function POST(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  if (!me?.handle) return NextResponse.json({ error: "no-handle", message: "Open the app once signed in to claim your handle." }, { status: 409 });

  const { handle } = (await req.json().catch(() => ({}))) as { handle?: string };
  const h = handle?.trim().toLowerCase().replace(/^@/, "");
  if (!isHandle(h)) return NextResponse.json({ error: "bad-handle", message: "Handles are 3–20 letters, numbers, . _ or -" }, { status: 400 });
  if (h === me.handle) return NextResponse.json({ error: "self", message: "That's you. Find someone else." }, { status: 400 });

  const [target] = await sql<{ id: string }[]>`SELECT id FROM users WHERE handle = ${h}`;
  if (!target) return NextResponse.json({ error: "not-found", message: "No Mustang with that handle." }, { status: 404 });

  const [theirs] = await sql`SELECT status FROM friendships WHERE user_id = ${target.id} AND friend_id = ${me.id}`;
  if (theirs) {
    await accept(sql, me.id, target.id);
    return NextResponse.json({ status: "accepted" });
  }
  await sql`INSERT INTO friendships (user_id, friend_id, status) VALUES (${me.id}, ${target.id}, 'pending') ON CONFLICT DO NOTHING`;
  return NextResponse.json({ status: "pending" });
}

/** accept | decline | remove */
export async function PATCH(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  if (!me) return NextResponse.json({ error: "no-account" }, { status: 409 });

  const { handle, action } = (await req.json().catch(() => ({}))) as { handle?: string; action?: string };
  if (!isHandle(handle)) return NextResponse.json({ error: "bad-handle" }, { status: 400 });
  const [other] = await sql<{ id: string }[]>`SELECT id FROM users WHERE handle = ${handle}`;
  if (!other) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (action === "accept") {
    const [req_] = await sql`SELECT 1 FROM friendships WHERE user_id = ${other.id} AND friend_id = ${me.id}`;
    if (!req_) return NextResponse.json({ error: "no-request" }, { status: 404 });
    await accept(sql, me.id, other.id);
  } else if (action === "decline" || action === "remove") {
    await sql`DELETE FROM friendships WHERE (user_id = ${me.id} AND friend_id = ${other.id}) OR (user_id = ${other.id} AND friend_id = ${me.id})`;
  } else {
    return NextResponse.json({ error: "bad-action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

async function accept(sql: NonNullable<ReturnType<typeof import("@/lib/db").db>>, me: string, other: string) {
  await sql`
    INSERT INTO friendships (user_id, friend_id, status) VALUES (${other}, ${me}, 'accepted'), (${me}, ${other}, 'accepted')
    ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'`;
}
