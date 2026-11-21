import { NextResponse, connection } from "next/server";
import { getVehicles } from "@/lib/ltc";

/** Live LTC bus positions (or last-good with "delayed", or "unavailable"). Always per-request. */
export async function GET() {
  await connection();
  return NextResponse.json(await getVehicles(), { headers: { "cache-control": "no-store" } });
}
