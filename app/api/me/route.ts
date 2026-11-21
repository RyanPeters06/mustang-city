import { NextResponse } from "next/server";
import { requireAccount, toHandle } from "@/lib/session";
import { fogRepFromCells } from "@/lib/rank";

const CELL = /^[0-9a-f]{15}$/;
const MAX_CELLS = 50_000;

type Body = {
  profile?: { name?: string; faculty?: string; year?: string; emblem?: string; accent?: string };
  cells?: string[];
  completions?: string[]; // mission slugs
};

/** Sync device progress to the account (idempotent). Returns the player's handle and server totals. */
export async function POST(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, user } = acc;
  let me = acc.me;

  const body = (await req.json().catch(() => ({}))) as Body;
  const p = body.profile ?? {};
  const displayName = (p.name?.trim() || user.name).slice(0, 40);
  const accent = /^#[0-9a-fA-F]{6}$/.test(p.accent ?? "") ? p.accent! : "#FF4F8B";
  const emblem = /^[a-z]{3,12}$/.test(p.emblem ?? "") ? p.emblem! : "mustang";

  if (!me) {
    [me] = await sql<{ id: string; handle: string | null }[]>`
      INSERT INTO users (auth0_id, email, display_name) VALUES (${user.sub}, ${user.email}, ${displayName})
      ON CONFLICT (auth0_id) DO UPDATE SET email = EXCLUDED.email
      RETURNING id, handle`;
  }

  // Claim a unique handle once (from the display name), then keep it stable.
  let handle = me.handle;
  if (!handle) {
    const base = toHandle(displayName);
    const taken = new Set(
      (await sql<{ handle: string }[]>`SELECT handle FROM users WHERE handle LIKE ${base + "%"}`).map((r) => r.handle),
    );
    handle = base;
    for (let i = 2; taken.has(handle); i++) handle = `${base.slice(0, 17)}${i}`;
  }

  const cells = (body.cells ?? []).filter((c) => typeof c === "string" && CELL.test(c)).slice(0, MAX_CELLS);
  if (cells.length) {
    await sql`
      INSERT INTO revealed_cells (user_id, h3_cell)
      SELECT ${me.id}, c FROM unnest(${cells}::text[]) AS c
      ON CONFLICT (user_id, h3_cell) DO NOTHING`;
  }
  const slugs = (body.completions ?? []).filter((s) => typeof s === "string").slice(0, 200);
  if (slugs.length) {
    await sql`
      INSERT INTO mission_completions (mission_id, user_id, gemini_pass, gemini_reason)
      SELECT id, ${me.id}, true, 'Synced from device' FROM missions WHERE slug = ANY(${slugs}::text[])
      ON CONFLICT (mission_id, user_id) DO NOTHING`;
  }

  const [stats] = await sql<{ cells: number; missions: number; mission_rep: number }[]>`
    SELECT
      (SELECT count(*)::int FROM revealed_cells WHERE user_id = ${me.id}) AS cells,
      (SELECT count(*)::int FROM mission_completions WHERE user_id = ${me.id}) AS missions,
      (SELECT coalesce(sum(m.rep_reward), 0)::int FROM mission_completions mc JOIN missions m ON m.id = mc.mission_id
        WHERE mc.user_id = ${me.id}) AS mission_rep`;
  const rep = fogRepFromCells(stats.cells) + stats.mission_rep;

  await sql`
    UPDATE users SET handle = ${handle}, display_name = ${displayName}, faculty = ${p.faculty?.slice(0, 60) || null},
      year = ${p.year?.slice(0, 20) || null}, emblem = ${emblem}, accent = ${accent},
      explored_cells = ${stats.cells}, mission_count = ${stats.missions}, rep = ${rep}, updated_at = now()
    WHERE id = ${me.id}`;

  return NextResponse.json({ handle, rep, cells: stats.cells, missions: stats.missions });
}
