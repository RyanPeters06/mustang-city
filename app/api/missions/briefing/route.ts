import { NextResponse } from "next/server";
import { missionBySlug } from "@/lib/missions";
import { geminiConfigured, rewriteBriefing } from "@/lib/gemini";

const TIMEOUT_MS = 5000;
const cache = new Map<string, string>(); // slug → in-character rewrite (per server instance)

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const mission = missionBySlug(slug);
  if (!mission) return NextResponse.json({ error: "not-found", message: "That mission doesn't exist." }, { status: 404 });

  const stored = { text: mission.briefing, source: "stored" as const };
  if (!geminiConfigured()) return NextResponse.json(stored);

  const hit = cache.get(slug);
  if (hit) return NextResponse.json({ text: hit, source: "gemini" });

  try {
    const text = await Promise.race([
      rewriteBriefing(mission.title, mission.briefing),
      new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS)),
    ]);
    if (!text) return NextResponse.json(stored);
    cache.set(slug, text);
    return NextResponse.json({ text, source: "gemini" });
  } catch (err) {
    console.error("rewriteBriefing failed", err);
    return NextResponse.json(stored);
  }
}
