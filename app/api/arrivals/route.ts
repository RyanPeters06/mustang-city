import { NextResponse } from "next/server";
import { getArrivals } from "@/lib/ltc";

/** Next arrivals at up to 3 stop ids: /api/arrivals?stops=A,B */
export async function GET(req: Request) {
  const stops = (new URL(req.url).searchParams.get("stops") ?? "").split(",").filter((s) => /^[A-Z0-9]{2,12}$/i.test(s)).slice(0, 3);
  if (!stops.length) return NextResponse.json({ arrivals: [], status: "unavailable" });
  return NextResponse.json(await getArrivals(stops), { headers: { "cache-control": "no-store" } });
}
