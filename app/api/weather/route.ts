import { NextResponse, connection } from "next/server";

/** Current weather over London, ON from Open-Meteo (free, no key; CC BY 4.0 — credited in Profile). 10-min cache. */
const URL_ =
  "https://api.open-meteo.com/v1/forecast?latitude=42.98&longitude=-81.25&current=weather_code,precipitation,rain,snowfall,temperature_2m,is_day&timezone=America%2FToronto";

export type Weather = { kind: "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm"; intensity: number; tempC: number | null; label: string; status: "live" | "unavailable" };

let cache: { w: Weather; at: number } | null = null;

function classify(code: number): { kind: Weather["kind"]; label: string } {
  if (code >= 95) return { kind: "storm", label: "Thunderstorm" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", label: "Snow" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { kind: "rain", label: code <= 57 ? "Drizzle" : "Rain" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Fog" };
  if (code >= 2) return { kind: "cloudy", label: code === 3 ? "Overcast" : "Cloudy" };
  return { kind: "clear", label: "Clear" };
}

export async function GET() {
  await connection();
  if (cache && Date.now() - cache.at < 10 * 60_000) return NextResponse.json(cache.w);
  try {
    const res = await fetch(URL_, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { current?: { weather_code?: number; precipitation?: number; snowfall?: number; temperature_2m?: number } };
    const c = j.current ?? {};
    const { kind, label } = classify(c.weather_code ?? 0);
    const amount = kind === "snow" ? (c.snowfall ?? 0) * 3 : (c.precipitation ?? 0);
    const w: Weather = { kind, label, intensity: Math.max(0.25, Math.min(1, amount / 4)), tempC: c.temperature_2m ?? null, status: "live" };
    cache = { w, at: Date.now() };
    return NextResponse.json(w);
  } catch (err) {
    console.error("weather", (err as Error).message);
    if (cache) return NextResponse.json(cache.w);
    return NextResponse.json({ kind: "clear", label: "", intensity: 0, tempC: null, status: "unavailable" } satisfies Weather);
  }
}
