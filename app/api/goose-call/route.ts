import { NextResponse } from "next/server";
import { connection } from "next/server";
import { DISTRICTS } from "@/lib/districts";
import { geminiConfigured, speak } from "@/lib/gemini";
import { regionQuests } from "@/lib/regions";

type Call = { script: string; audio: { data: string; mime: string } | null; source: "gemini" | "template" };
const cache = new Map<string, Call>(); // region → call (per server instance)
const TIMEOUT_MS = 9000;

const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS))]);

/**
 * "The Goose calls you": a short in-character phone call when you first set foot in an unclaimed region.
 * The line is templated from the region's own quest board (no new facts), voiced with Gemini TTS when available;
 * otherwise the phone's own speech voice reads the script.
 */
export async function GET(req: Request) {
  await connection();
  const region = new URL(req.url).searchParams.get("region") ?? "";
  if (!DISTRICTS.some((d) => d.name === region)) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const hit = cache.get(region);
  if (hit) return NextResponse.json(hit);

  const quests = regionQuests(region);
  const local = quests.find((q) => q.kind === "checkin" && !q.place);
  const sig = quests.find((q) => q.kind === "mission" || q.kind === "collectible" || (q.kind === "checkin" && q.place));
  const script = [
    `Kid. It's me. You're in ${region} now.`,
    `This neighbourhood isn't ours yet. Four jobs, you need three.`,
    local ? `${local.title}.` : "",
    sig ? `And ${sig.title.charAt(0).toLowerCase()}${sig.title.slice(1)}.` : "",
    "Do it, and the whole place is yours. Honk.",
  ]
    .filter(Boolean)
    .join(" ");

  let call: Call = { script, audio: null, source: "template" };
  if (geminiConfigured()) {
    try {
      const audio = await withTimeout(speak(script));
      if (audio) call = { script, audio, source: "gemini" };
    } catch (err) {
      console.error("goose call TTS failed", err);
    }
  }
  if (call.source === "gemini") cache.set(region, call);
  return NextResponse.json(call);
}
