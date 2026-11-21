import { NextResponse } from "next/server";
import { missionBySlug } from "@/lib/missions";
import { distanceM, type LngLat } from "@/lib/geo";
import { geminiConfigured, verifyPhoto } from "@/lib/gemini";
import { db } from "@/lib/db";
import { auth0, isUwoEmail } from "@/lib/auth0";

const PASS_CONFIDENCE = 0.6; // brief → Gemini photo-check contract
const MAX_ACCURACY_M = 50;
const MAX_IMAGE_B64 = 3_000_000; // ~2.2 MB JPEG; client sends ≤ 1080 px (~400 KB)

type Body = { slug?: string; lat?: number; lng?: number; accuracy?: number; image?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad-request", message: "Couldn't read that request." }, { status: 400 });
  }

  const mission = body.slug ? missionBySlug(body.slug) : undefined;
  if (!mission) return NextResponse.json({ error: "not-found", message: "That mission doesn't exist." }, { status: 404 });

  const { lat, lng, accuracy } = body;
  if (typeof lat !== "number" || typeof lng !== "number" || typeof accuracy !== "number") {
    return NextResponse.json({ error: "no-location", message: "Turn on location to complete missions." }, { status: 400 });
  }
  if (accuracy > MAX_ACCURACY_M) {
    return NextResponse.json(
      { error: "weak-gps", message: `GPS is too rough (±${Math.round(accuracy)} m). Step outside and try again.` },
      { status: 422 },
    );
  }
  const distance = distanceM([lng, lat] as LngLat, mission.lngLat);
  if (distance > mission.radiusM + Math.min(accuracy, 25)) {
    return NextResponse.json(
      { error: "too-far", distance: Math.round(distance), message: `You're ${Math.round(distance - mission.radiusM)} m away. Get closer.` },
      { status: 422 },
    );
  }

  let verdict = { pass: true, confidence: 1, reason: "Checked in." };
  if (mission.type === "photo") {
    if (!body.image || body.image.length > MAX_IMAGE_B64) {
      return NextResponse.json({ error: "no-photo", message: "Take a photo first." }, { status: 400 });
    }
    if (!geminiConfigured()) {
      return NextResponse.json(
        { error: "verification-unavailable", message: "Photo checks aren't switched on for this deployment yet." },
        { status: 503 },
      );
    }
    try {
      verdict = await verifyPhoto(mission.criteria, body.image.replace(/^data:image\/\w+;base64,/, ""));
    } catch (err) {
      console.error("verifyPhoto failed", err);
      return NextResponse.json({ error: "verification-failed", message: "The photo check hiccuped. Try again." }, { status: 502 });
    }
  }

  const pass = verdict.pass && verdict.confidence >= PASS_CONFIDENCE;
  if (pass) await saveCompletion(mission.slug, mission.rep, lat, lng, verdict.reason).catch((e) => console.error("saveCompletion", e));

  return NextResponse.json({ pass, confidence: verdict.confidence, reason: verdict.reason, rep: pass ? mission.rep : 0 });
}

/** Persist to Tiger Data when both the DB and a signed-in @uwo.ca session exist; otherwise the device keeps it. */
async function saveCompletion(slug: string, rep: number, lat: number, lng: number, reason: string) {
  const sql = db();
  if (!sql || !auth0) return;
  const session = await auth0.getSession();
  const user = session?.user;
  if (!user?.sub || !isUwoEmail(user.email)) return;

  const [row] = await sql`
    INSERT INTO users (auth0_id, email, display_name)
    VALUES (${user.sub}, ${user.email!}, ${user.name ?? user.email!.split("@")[0]})
    ON CONFLICT (auth0_id) DO UPDATE SET email = EXCLUDED.email
    RETURNING id`;
  const inserted = await sql`
    INSERT INTO mission_completions (mission_id, user_id, lat, lng, gemini_pass, gemini_reason)
    SELECT id, ${row.id}, ${lat}, ${lng}, true, ${reason} FROM missions WHERE slug = ${slug}
    ON CONFLICT (mission_id, user_id) DO NOTHING
    RETURNING id`;
  if (inserted.length) await sql`UPDATE users SET rep = rep + ${rep} WHERE id = ${row.id}`;
}
