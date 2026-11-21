import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";
import { distanceM, type LngLat } from "@/lib/geo";

/** Check in to a student mission (location verified server-side). */
export async function POST(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  const b = (await req.json().catch(() => ({}))) as { id?: string; lat?: number; lng?: number; accuracy?: number };
  const mid = Number(b.id);
  if (!me || !Number.isInteger(mid) || typeof b.lat !== "number" || typeof b.lng !== "number" || typeof b.accuracy !== "number")
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const [m] = await sql<{ lat: number; lng: number; radius_m: number; rep_reward: number; creator_id: string | null }[]>`
    SELECT lat, lng, radius_m, rep_reward, creator_id FROM missions WHERE id = ${mid} AND is_official = false AND active`;
  if (!m) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (m.creator_id === me.id) return NextResponse.json({ error: "own", message: "That's your own job. Send someone else." }, { status: 422 });
  if (b.accuracy > 50) return NextResponse.json({ error: "weak-gps", message: "GPS too rough. Step outside." }, { status: 422 });
  const d = distanceM([b.lng, b.lat] as LngLat, [m.lng, m.lat]);
  if (d > m.radius_m + Math.min(b.accuracy, 25)) return NextResponse.json({ error: "too-far", message: `You're ${Math.round(d - m.radius_m)} m away.` }, { status: 422 });
  const added = await sql`
    INSERT INTO mission_completions (mission_id, user_id, lat, lng, gemini_pass, gemini_reason)
    VALUES (${mid}, ${me.id}, ${b.lat}, ${b.lng}, true, 'Student job check-in') ON CONFLICT (mission_id, user_id) DO NOTHING RETURNING id`;
  if (added.length) await sql`UPDATE users SET rep = rep + ${m.rep_reward} WHERE id = ${me.id}`;
  return NextResponse.json({ pass: true, rep: m.rep_reward });
}
