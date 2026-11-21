import { NextResponse } from "next/server";
import { DISTRICTS } from "@/lib/districts";
import { geminiConfigured, speak, writeRadioScript } from "@/lib/gemini";
import { radioFacts, templateScript } from "@/lib/radioFacts";

type Segment = { script: string; audio: { data: string; mime: string } | null; source: "gemini" | "template" };
const cache = new Map<string, Segment>(); // district → segment (per server instance)
const TIMEOUT_MS = 12_000;

const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS))]);

/**
 * A ~15-second radio segment for a neighbourhood. Gemini writes it from stored facts and voices it with
 * Gemini TTS; without a key (or on any failure) a template quotes the facts and the phone's own voice reads it.
 */
export async function GET(req: Request) {
  const district = new URL(req.url).searchParams.get("district") ?? "";
  if (!DISTRICTS.some((d) => d.name === district)) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const hit = cache.get(district);
  if (hit) return NextResponse.json(hit);

  const { facts, jobs } = radioFacts(district);
  let seg: Segment = { script: templateScript(district, facts, jobs), audio: null, source: "template" };

  if (geminiConfigured()) {
    try {
      const script = await withTimeout(writeRadioScript(district, facts));
      if (script) {
        const audio = await withTimeout(speak(script)).catch(() => null);
        seg = { script, audio, source: "gemini" };
      }
    } catch (err) {
      console.error("radio segment failed", err);
    }
  }
  if (seg.source === "gemini") cache.set(district, seg);
  return NextResponse.json(seg);
}
