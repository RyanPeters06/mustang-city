import { NextResponse } from "next/server";
import { latLngToCell } from "h3-js";
import { requireAccount } from "@/lib/session";
import { geminiConfigured, screenTag } from "@/lib/gemini";
import { H3_RES } from "@/lib/fog";
import { TAG_DAILY_LIMIT, TAG_MAX_PHOTO_B64, noteProblem, type Tag } from "@/lib/tagRules";

const MAX_ACCURACY_M = 50;

type Row = {
  id: number;
  h3_cell: string;
  lat: number;
  lng: number;
  note: string | null;
  photo_url: string | null;
  votes: number;
  created_at: Date;
  author: string;
  mine: boolean;
  voted: boolean;
};

const toTag = (r: Row): Tag => ({
  id: String(r.id),
  cell: r.h3_cell,
  lngLat: [r.lng, r.lat],
  note: r.note ?? "",
  photo: r.photo_url,
  author: r.author,
  mine: r.mine,
  votes: r.votes,
  voted: r.voted,
  createdAt: r.created_at.getTime(),
  kind: "server",
});

/**
 * Tags the signed-in player may see: their own, plus any in a cell THEY have revealed
 * (brief → "visible once that cell is revealed for the viewer"). Server-side gate, not a client filter.
 */
export async function GET() {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  if (!me) return NextResponse.json({ tags: [] });

  const rows = await sql<Row[]>`
    SELECT t.id, t.h3_cell, t.lat, t.lng, t.note, t.photo_url, t.votes, t.created_at,
           coalesce(u.handle, u.display_name) AS author,
           (t.user_id = ${me.id}) AS mine,
           EXISTS (SELECT 1 FROM tag_votes v WHERE v.tag_id = t.id AND v.user_id = ${me.id}) AS voted
    FROM tags t JOIN users u ON u.id = t.user_id
    WHERE t.user_id = ${me.id}
       OR EXISTS (SELECT 1 FROM revealed_cells r WHERE r.user_id = ${me.id} AND r.h3_cell = t.h3_cell)
    ORDER BY t.created_at DESC
    LIMIT 300`;
  return NextResponse.json({ tags: rows.map(toTag) });
}

type Body = { lat?: number; lng?: number; accuracy?: number; note?: string; photo?: string };

/** Pin a tag to the player's current cell. The cell comes from the fix, never from the client. */
export async function POST(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  if (!me) return NextResponse.json({ error: "no-profile", message: "Open Profile once to finish setting up." }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const { lat, lng, accuracy } = body;
  if (typeof lat !== "number" || typeof lng !== "number" || typeof accuracy !== "number") {
    return NextResponse.json({ error: "no-location", message: "Turn on location to leave a tag." }, { status: 400 });
  }
  if (accuracy > MAX_ACCURACY_M) {
    return NextResponse.json({ error: "weak-gps", message: "GPS is too rough to pin a tag. Step outside." }, { status: 422 });
  }
  const note = (body.note ?? "").trim();
  const problem = noteProblem(note);
  if (problem) return NextResponse.json({ error: "bad-note", message: problem }, { status: 422 });

  let photo: string | null = null;
  if (body.photo) {
    if (!geminiConfigured()) {
      return NextResponse.json({ error: "photos-off", message: "Photo tags need screening, which isn't on yet. Post the note alone." }, { status: 503 });
    }
    if (!/^data:image\/jpeg;base64,/.test(body.photo) || body.photo.length > TAG_MAX_PHOTO_B64) {
      return NextResponse.json({ error: "bad-photo", message: "That photo is too big." }, { status: 413 });
    }
    photo = body.photo;
  }

  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM tags WHERE user_id = ${me.id} AND created_at > now() - interval '1 day'`;
  if (n >= TAG_DAILY_LIMIT) {
    return NextResponse.json({ error: "limit", message: `That's ${TAG_DAILY_LIMIT} tags today. Come back tomorrow.` }, { status: 429 });
  }

  if (geminiConfigured()) {
    try {
      const verdict = await screenTag(note, photo?.replace(/^data:image\/jpeg;base64,/, ""));
      if (!verdict.ok) return NextResponse.json({ error: "rejected", message: verdict.reason || "The Goose won't post that one." }, { status: 422 });
    } catch (err) {
      console.error("screenTag failed", err);
      if (photo) return NextResponse.json({ error: "screen-failed", message: "Couldn't check the photo. Try again." }, { status: 502 });
    }
  }

  const cell = latLngToCell(lat, lng, H3_RES);
  const [row] = await sql<Row[]>`
    WITH t AS (
      INSERT INTO tags (user_id, h3_cell, lat, lng, note, photo_url)
      VALUES (${me.id}, ${cell}, ${lat}, ${lng}, ${note}, ${photo})
      RETURNING *
    )
    SELECT t.id, t.h3_cell, t.lat, t.lng, t.note, t.photo_url, t.votes, t.created_at,
           coalesce(u.handle, u.display_name) AS author, true AS mine, false AS voted
    FROM t JOIN users u ON u.id = t.user_id`;
  // The author has obviously revealed the cell they're standing in.
  await sql`INSERT INTO revealed_cells (user_id, h3_cell) VALUES (${me.id}, ${cell}) ON CONFLICT DO NOTHING`;
  return NextResponse.json({ tag: toTag(row) });
}

/** Delete one of your own tags (`?id=`). Upvote Rep it earned goes with it on the next sync. */
export async function DELETE(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!me || !Number.isInteger(id)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const gone = await sql`DELETE FROM tags WHERE id = ${id} AND user_id = ${me.id} RETURNING id`;
  if (!gone.length) return NextResponse.json({ error: "not-found", message: "That tag isn't yours." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
