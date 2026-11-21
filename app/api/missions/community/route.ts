import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";
import { geminiConfigured, screenMission } from "@/lib/gemini";
import { districtAt } from "@/lib/districts";
import { HIDE_AT_SCORE, STUDENT_DAILY_LIMIT, STUDENT_MISSION_REP, missionProblem, type CommunityMission } from "@/lib/communityRules";

type Row = { id: number; slug: string; title: string; briefing: string; lat: number; lng: number; radius_m: number; rep_reward: number; score: number; my_vote: number | null; author: string; mine: boolean };
const toMission = (r: Row): CommunityMission => ({
  id: String(r.id),
  slug: r.slug,
  title: r.title,
  briefing: r.briefing,
  lngLat: [r.lng, r.lat],
  radiusM: r.radius_m,
  rep: r.rep_reward,
  score: r.score,
  myVote: (r.my_vote ?? 0) as -1 | 0 | 1,
  author: r.author,
  mine: r.mine,
  kind: "server",
});

/** Active student missions, best voted first (buried ones hidden). */
export async function GET() {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  const meId = me?.id ?? "00000000-0000-0000-0000-000000000000";
  const rows = await sql<Row[]>`
    SELECT m.id, m.slug, m.title, m.briefing, m.lat, m.lng, m.radius_m, m.rep_reward,
           coalesce(sum(v.value), 0)::int AS score,
           max(CASE WHEN v.user_id = ${meId}::uuid THEN v.value END)::int AS my_vote,
           coalesce(u.handle, u.display_name, 'student') AS author,
           (m.creator_id = ${meId}::uuid) AS mine
    FROM missions m LEFT JOIN mission_votes v ON v.mission_id = m.id LEFT JOIN users u ON u.id = m.creator_id
    WHERE m.is_official = false AND m.active
    GROUP BY m.id, u.handle, u.display_name
    HAVING coalesce(sum(v.value), 0) > ${HIDE_AT_SCORE}
    ORDER BY score DESC, m.id DESC LIMIT 50`;
  return NextResponse.json({ missions: rows.map(toMission) });
}

type Body = { title?: string; briefing?: string; lat?: number; lng?: number; accuracy?: number };

/** Create a student mission at your current spot. Gemini screening is required (no screening → not accepted). */
export async function POST(req: Request) {
  const acc = await requireAccount();
  if ("error" in acc) return acc.error;
  const { sql, me } = acc;
  if (!me) return NextResponse.json({ error: "no-profile", message: "Open Profile once to finish setting up." }, { status: 409 });
  const b = (await req.json().catch(() => ({}))) as Body;
  const title = (b.title ?? "").trim();
  const briefing = (b.briefing ?? "").trim().slice(0, 140);
  const problem = missionProblem(title, briefing);
  if (problem) return NextResponse.json({ error: "bad-mission", message: problem }, { status: 422 });
  if (typeof b.lat !== "number" || typeof b.lng !== "number" || typeof b.accuracy !== "number" || b.accuracy > 50) {
    return NextResponse.json({ error: "no-location", message: "Stand at the spot with good GPS to post a job there." }, { status: 400 });
  }
  if (!geminiConfigured()) {
    return NextResponse.json({ error: "screening-off", message: "Student jobs need screening, which isn't switched on yet." }, { status: 503 });
  }
  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM missions WHERE creator_id = ${me.id} AND created_at > now() - interval '1 day'`;
  if (n >= STUDENT_DAILY_LIMIT) return NextResponse.json({ error: "limit", message: `That's ${STUDENT_DAILY_LIMIT} jobs today. Come back tomorrow.` }, { status: 429 });

  try {
    const verdict = await screenMission(title, briefing, districtAt([b.lng, b.lat]) ?? "London, Ontario");
    if (!verdict.ok) return NextResponse.json({ error: "rejected", message: verdict.reason || "The Goose won't run that job." }, { status: 422 });
  } catch (err) {
    console.error("screenMission", err);
    return NextResponse.json({ error: "screen-failed", message: "Couldn't screen that job. Try again." }, { status: 502 });
  }
  const slug = `student-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const [row] = await sql<Row[]>`
    INSERT INTO missions (slug, title, briefing, type, lat, lng, radius_m, criteria, rep_reward, creator_id, is_official)
    VALUES (${slug}, ${title}, ${briefing}, 'checkin', ${b.lat}, ${b.lng}, 75, 'User is at the spot.', ${STUDENT_MISSION_REP}, ${me.id}, false)
    RETURNING id, slug, title, briefing, lat, lng, radius_m, rep_reward, 0 AS score, NULL::int AS my_vote, 'you' AS author, true AS mine`;
  return NextResponse.json({ mission: toMission(row) });
}
