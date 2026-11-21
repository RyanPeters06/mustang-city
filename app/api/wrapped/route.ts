import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";

/** Percentile of explored cells among all Western players (only real data — null without DB/sign-in). */
export async function GET() {
  const acc = await requireAccount();
  if ("error" in acc) return NextResponse.json({ percentile: null, players: 0 });
  const { sql, me } = acc;
  if (!me) return NextResponse.json({ percentile: null, players: 0 });
  const [row] = await sql<{ below: number; players: number }[]>`
    SELECT count(*) FILTER (WHERE explored_cells < (SELECT explored_cells FROM users WHERE id = ${me.id}))::int AS below,
           count(*)::int AS players
    FROM users`;
  if (!row || row.players < 5) return NextResponse.json({ percentile: null, players: row?.players ?? 0 }); // too few to mean anything
  return NextResponse.json({ percentile: Math.round((row.below / row.players) * 100), players: row.players });
}
