import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";
import { TAG_VOTE_REP } from "@/lib/tagRules";

/** Upvote (POST) or remove an upvote (DELETE). Only on tags the voter can see; never your own. */
async function vote(id: string, on: boolean) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  const tagId = Number(id);
  if (!me || !Number.isInteger(tagId)) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const [tag] = await sql<{ user_id: string }[]>`
    SELECT t.user_id FROM tags t
    WHERE t.id = ${tagId}
      AND EXISTS (SELECT 1 FROM revealed_cells r WHERE r.user_id = ${me.id} AND r.h3_cell = t.h3_cell)`;
  if (!tag) return NextResponse.json({ error: "not-found", message: "Clear the fog there first." }, { status: 404 });
  if (tag.user_id === me.id) return NextResponse.json({ error: "own-tag", message: "You can't upvote your own tag." }, { status: 422 });

  const changed = on
    ? await sql`INSERT INTO tag_votes (tag_id, user_id) VALUES (${tagId}, ${me.id}) ON CONFLICT DO NOTHING RETURNING tag_id`
    : await sql`DELETE FROM tag_votes WHERE tag_id = ${tagId} AND user_id = ${me.id} RETURNING tag_id`;
  if (changed.length) {
    const delta = on ? 1 : -1;
    // Keep tags.votes and the author's Rep in step (+10 per upvote; /api/me recomputes the same total).
    await sql`UPDATE tags SET votes = greatest(0, votes + ${delta}) WHERE id = ${tagId}`;
    await sql`UPDATE users SET rep = greatest(0, rep + ${delta * TAG_VOTE_REP}) WHERE id = ${tag.user_id}`;
  }
  const [{ votes }] = await sql<{ votes: number }[]>`SELECT votes FROM tags WHERE id = ${tagId}`;
  return NextResponse.json({ votes, voted: on });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return vote((await params).id, true);
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return vote((await params).id, false);
}
