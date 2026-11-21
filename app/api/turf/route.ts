import { NextResponse, connection } from "next/server";
import { cellToLatLng } from "h3-js";
import { db } from "@/lib/db";
import { DISTRICTS, districtIndexAt } from "@/lib/districts";

export type TurfRow = { district: string; faculty: string; cells: number; share: number };

const cellDistrict = new Map<string, number>();
let cache: { rows: TurfRow[]; at: number } | null = null;
const TTL = 5 * 60_000;

/**
 * Faculty turf: for each neighbourhood, the faculty whose players have cleared the most of it.
 * Aggregate only (no individual data). Needs DATABASE_URL; otherwise 503.
 */
export async function GET() {
  await connection();
  const sql = db();
  if (!sql) return NextResponse.json({ rows: [], status: "unavailable" }, { status: 503 });
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json({ rows: cache.rows, status: "live" });

  const data = await sql<{ h3_cell: string; faculty: string }[]>`
    SELECT r.h3_cell, u.faculty FROM revealed_cells r JOIN users u ON u.id = r.user_id
    WHERE u.faculty IS NOT NULL LIMIT 400000`;
  const counts = DISTRICTS.map(() => new Map<string, number>());
  for (const { h3_cell, faculty } of data) {
    let idx = cellDistrict.get(h3_cell);
    if (idx === undefined) {
      const [lat, lng] = cellToLatLng(h3_cell);
      idx = districtIndexAt([lng, lat]);
      cellDistrict.set(h3_cell, idx);
    }
    if (idx >= 0) counts[idx].set(faculty, (counts[idx].get(faculty) ?? 0) + 1);
  }
  const rows: TurfRow[] = [];
  counts.forEach((m, i) => {
    const total = [...m.values()].reduce((s, n) => s + n, 0);
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) rows.push({ district: DISTRICTS[i].name, faculty: top[0], cells: top[1], share: top[1] / total });
  });
  cache = { rows, at: Date.now() };
  return NextResponse.json({ rows, status: "live" });
}
