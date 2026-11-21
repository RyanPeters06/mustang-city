import { NextResponse } from "next/server";
import { BUILDING_WIKI } from "@/lib/buildingWiki";

type History = { title: string; extract: string; url: string; note?: string };
const cache = new Map<string, { at: number; value: History | null }>();
const WEEK = 7 * 24 * 3600 * 1000;

/** Sourced history for a campus building: Wikipedia summary (first 3 sentences) + link, cached. */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "";
  const entry = BUILDING_WIKI[name];
  if (!entry) return NextResponse.json({ history: null });

  const hit = cache.get(entry.title);
  if (hit && Date.now() - hit.at < WEEK) return respond(hit.value, entry.note);

  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entry.title.replace(/ /g, "_"))}`, {
      headers: { "user-agent": "mustang-city/0.1 (campus exploration game)" },
    });
    if (!res.ok) throw new Error(String(res.status));
    const d = (await res.json()) as { title?: string; extract?: string; type?: string; content_urls?: { desktop?: { page?: string } } };
    const sentences = (d.extract ?? "").split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
    const value = d.type === "disambiguation" || !sentences ? null : { title: d.title ?? entry.title, extract: sentences, url: d.content_urls?.desktop?.page ?? "" };
    cache.set(entry.title, { at: Date.now(), value });
    return respond(value, entry.note);
  } catch {
    return NextResponse.json({ history: null, error: "unavailable" }, { status: 200 });
  }
}

function respond(history: History | null, note?: string) {
  return NextResponse.json(
    { history: history ? { ...history, note } : null },
    { headers: { "cache-control": "public, s-maxage=604800, stale-while-revalidate=86400" } },
  );
}
