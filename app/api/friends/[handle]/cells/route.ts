import { NextResponse } from "next/server";
import { isHandle, requireAccount } from "@/lib/session";

/** A friend's revealed cells — only for accepted friends (brief → privacy: revealed cells, never raw traces). */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  const { handle } = await params;
  if (!me || !isHandle(handle)) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const [friend] = await sql<{ id: string }[]>`
    SELECT u.id FROM users u JOIN friendships f ON f.friend_id = u.id
    WHERE u.handle = ${handle} AND f.user_id = ${me.id} AND f.status = 'accepted'`;
  if (!friend) return NextResponse.json({ error: "not-friends", message: "You can only see friends' maps." }, { status: 403 });

  const rows = await sql<{ h3_cell: string }[]>`SELECT h3_cell FROM revealed_cells WHERE user_id = ${friend.id} LIMIT 50000`;
  return NextResponse.json({ cells: rows.map((r) => r.h3_cell) });
}
