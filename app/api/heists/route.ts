import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";
import { missionBySlug } from "@/lib/missions";
import { distanceM, type LngLat } from "@/lib/geo";
import { HEIST_CREW, HEIST_WINDOW_MS, type HeistStatus } from "@/lib/heistRules";

type Attempt = { id: number; started_at: Date; member_ids: string[]; status: "open" | "complete" | "expired" };
const WINDOW = `${HEIST_WINDOW_MS / 60_000} minutes`;

function view(a: Attempt | undefined, me: string): HeistStatus {
  if (!a) return { state: "none", members: 0, needed: HEIST_CREW, expiresAt: null, joined: false };
  return {
    state: a.status,
    members: a.member_ids.length,
    needed: HEIST_CREW,
    expiresAt: a.started_at.getTime() + HEIST_WINDOW_MS,
    joined: a.member_ids.includes(me),
  };
}

/** Current heist at a mission (the open one in the window, or my latest result). */
export async function GET(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  const m = missionBySlug(new URL(req.url).searchParams.get("slug") ?? "");
  if (!me || m?.type !== "heist") return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await sql`UPDATE heist_attempts SET status = 'expired' WHERE status = 'open' AND started_at < now() - ${WINDOW}::interval`;
  const [a] = await sql<Attempt[]>`
    SELECT h.id, h.started_at, h.member_ids, h.status FROM heist_attempts h JOIN missions ms ON ms.id = h.mission_id
    WHERE ms.slug = ${m.slug} AND (h.status = 'open' OR ${me.id}::uuid = ANY(h.member_ids))
    ORDER BY h.started_at DESC LIMIT 1`;
  return NextResponse.json(view(a, me.id));
}

type Body = { slug?: string; lat?: number; lng?: number; accuracy?: number };

/** Join (or start) the heist at your location. Completes when HEIST_CREW players are in within the window. */
export async function POST(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  const b = (await req.json().catch(() => ({}))) as Body;
  const m = missionBySlug(b.slug ?? "");
  if (!me || m?.type !== "heist") return NextResponse.json({ error: "bad-request" }, { status: 400 });
  if (typeof b.lat !== "number" || typeof b.lng !== "number" || typeof b.accuracy !== "number") {
    return NextResponse.json({ error: "no-location", message: "Turn on location to join the heist." }, { status: 400 });
  }
  if (b.accuracy > 50) return NextResponse.json({ error: "weak-gps", message: "GPS too rough to join. Step outside." }, { status: 422 });
  const d = distanceM([b.lng, b.lat] as LngLat, m.lngLat);
  if (d > m.radiusM + Math.min(b.accuracy, 25)) {
    return NextResponse.json({ error: "too-far", message: `You're ${Math.round(d - m.radiusM)} m out. The crew meets at the spot.` }, { status: 422 });
  }

  const result = await sql.begin(async (tx) => {
    await tx`UPDATE heist_attempts SET status = 'expired' WHERE status = 'open' AND started_at < now() - ${WINDOW}::interval`;
    let [a] = await tx<Attempt[]>`
      SELECT h.id, h.started_at, h.member_ids, h.status FROM heist_attempts h JOIN missions ms ON ms.id = h.mission_id
      WHERE ms.slug = ${m.slug} AND h.status = 'open' ORDER BY h.started_at DESC LIMIT 1 FOR UPDATE`;
    if (!a) {
      [a] = await tx<Attempt[]>`
        INSERT INTO heist_attempts (mission_id, member_ids) SELECT id, ARRAY[${me.id}::uuid] FROM missions WHERE slug = ${m.slug}
        RETURNING id, started_at, member_ids, status`;
    } else if (!a.member_ids.includes(me.id)) {
      [a] = await tx<Attempt[]>`
        UPDATE heist_attempts SET member_ids = array_append(member_ids, ${me.id}::uuid) WHERE id = ${a.id}
        RETURNING id, started_at, member_ids, status`;
    }
    if (a && a.member_ids.length >= HEIST_CREW && a.status === "open") {
      [a] = await tx<Attempt[]>`UPDATE heist_attempts SET status = 'complete' WHERE id = ${a.id} RETURNING id, started_at, member_ids, status`;
      // Everyone in the crew gets the completion + Rep (once).
      const added = await tx<{ user_id: string }[]>`
        INSERT INTO mission_completions (mission_id, user_id, lat, lng, gemini_pass, gemini_reason)
        SELECT ms.id, u, ${m.lngLat[1]}, ${m.lngLat[0]}, true, 'Heist crew complete'
        FROM missions ms, unnest(${a.member_ids}::uuid[]) AS u WHERE ms.slug = ${m.slug}
        ON CONFLICT (mission_id, user_id) DO NOTHING RETURNING user_id`;
      if (added.length) await tx`UPDATE users SET rep = rep + ${m.rep} WHERE id = ANY(${added.map((r) => r.user_id)}::uuid[])`;
    }
    return a;
  });
  return NextResponse.json(view(result, me.id));
}
