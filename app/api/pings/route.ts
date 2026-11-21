import { NextResponse } from "next/server";
import { latLngToCell } from "h3-js";
import { requireAccount } from "@/lib/session";
import { H3_RES } from "@/lib/fog";

type Ping = { ts: number; lat: number; lng: number; acc: number };
const MAX_BATCH = 500;

/**
 * Batch-insert live GPS fixes into the `location_pings` hypertable (brief → Data model).
 * Feeds replay/Wrapped across devices and the `user_daily_cells` continuous aggregate.
 */
export async function POST(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  if (!me) return NextResponse.json({ error: "no-account", message: "Sync your profile first." }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as { pings?: Ping[] };
  const now = Date.now();
  const pings = (body.pings ?? [])
    .filter(
      (p) =>
        Number.isFinite(p.ts) && p.ts > now - 7 * 864e5 && p.ts < now + 6e4 && // last week, not the future
        Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && Number.isFinite(p.acc) && p.acc >= 0 && p.acc < 5000,
    )
    .slice(0, MAX_BATCH);
  if (!pings.length) return NextResponse.json({ inserted: 0 });

  const ts = pings.map((p) => new Date(p.ts).toISOString());
  const lat = pings.map((p) => p.lat);
  const lng = pings.map((p) => p.lng);
  const accuracy = pings.map((p) => Math.round(p.acc));
  const cells = pings.map((p) => latLngToCell(p.lat, p.lng, H3_RES));

  await sql`
    INSERT INTO location_pings (user_id, ts, lat, lng, accuracy_m, h3_cell)
    SELECT ${me.id}, t::timestamptz, la, ln, a, c
    FROM unnest(${ts}::text[], ${lat}::float8[], ${lng}::float8[], ${accuracy}::real[], ${cells}::text[]) AS x(t, la, ln, a, c)`;

  return NextResponse.json({ inserted: pings.length });
}
