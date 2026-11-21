import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";

/** Vote on a student mission: value 1, -1 or 0 (clear). Not on your own. */
export async function POST(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  const { id, value } = (await req.json().catch(() => ({}))) as { id?: string; value?: number };
  const mid = Number(id);
  if (!me || !Number.isInteger(mid) || ![-1, 0, 1].includes(value ?? NaN)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const [m] = await sql<{ creator_id: string | null }[]>`SELECT creator_id FROM missions WHERE id = ${mid} AND is_official = false`;
  if (!m) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (m.creator_id === me.id) return NextResponse.json({ error: "own", message: "You can't vote on your own job." }, { status: 422 });
  if (value === 0) await sql`DELETE FROM mission_votes WHERE mission_id = ${mid} AND user_id = ${me.id}`;
  else
    await sql`INSERT INTO mission_votes (mission_id, user_id, value) VALUES (${mid}, ${me.id}, ${value!})
              ON CONFLICT (mission_id, user_id) DO UPDATE SET value = EXCLUDED.value`;
  const [{ score }] = await sql<{ score: number }[]>`SELECT coalesce(sum(value), 0)::int AS score FROM mission_votes WHERE mission_id = ${mid}`;
  return NextResponse.json({ score, myVote: value });
}
