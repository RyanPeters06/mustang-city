import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";

export type BoardRow = {
  rank: number;
  handle: string;
  name: string;
  faculty: string | null;
  emblem: string;
  accent: string;
  rep: number;
  cells: number;
  me: boolean;
};

/**
 * GET /api/leaderboard?period=week|all&scope=all|faculty|friends&metric=rep|explored
 * Weekly Rep = cells first revealed this week / 7 + mission Rep earned this week (London week, Monday start).
 */
export async function GET(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  if (!me) return NextResponse.json({ rows: [], mine: null });

  const q = new URL(req.url).searchParams;
  const period = q.get("period") === "week" ? "week" : "all";
  const scope = ["faculty", "friends"].includes(q.get("scope") ?? "") ? q.get("scope")! : "all";
  const metric = q.get("metric") === "explored" ? "cells" : "rep";

  const scopeSql =
    scope === "friends"
      ? `AND (u.id = $1 OR u.id IN (SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'))`
      : scope === "faculty"
        ? `AND u.faculty IS NOT NULL AND u.faculty = (SELECT faculty FROM users WHERE id = $1)`
        : "";

  const base =
    period === "week"
      ? `WITH wk AS (SELECT date_trunc('week', now() AT TIME ZONE 'America/Toronto') AT TIME ZONE 'America/Toronto' AS start),
         c AS (SELECT user_id, count(*)::int AS n FROM revealed_cells, wk WHERE first_seen_at >= wk.start GROUP BY 1),
         m AS (SELECT mc.user_id, sum(mi.rep_reward)::int AS r FROM mission_completions mc
                 JOIN missions mi ON mi.id = mc.mission_id, wk WHERE mc.completed_at >= wk.start GROUP BY 1),
         s AS (SELECT u.*, (coalesce(c.n, 0) / 7 + coalesce(m.r, 0))::int AS score_rep, coalesce(c.n, 0) AS score_cells
               FROM users u LEFT JOIN c ON c.user_id = u.id LEFT JOIN m ON m.user_id = u.id
               WHERE u.handle IS NOT NULL ${scopeSql})`
      : `WITH s AS (SELECT u.*, u.rep AS score_rep, u.explored_cells AS score_cells FROM users u
               WHERE u.handle IS NOT NULL ${scopeSql})`;

  const rows = await sql.unsafe<(Omit<BoardRow, "me"> & { id: string })[]>(
    `${base},
     ranked AS (SELECT s.*, row_number() OVER (ORDER BY score_${metric} DESC, s.created_at ASC)::int AS rank FROM s)
     SELECT id, rank, handle, display_name AS name, faculty, emblem, accent, score_rep AS rep, score_cells AS cells
     FROM ranked WHERE rank <= 50 OR id = $1 ORDER BY rank`,
    [me.id],
  );

  const out: BoardRow[] = rows.map(({ id, ...r }) => ({ ...r, me: id === me.id }));
  return NextResponse.json({ rows: out.filter((r) => r.rank <= 50), mine: out.find((r) => r.me) ?? null });
}
