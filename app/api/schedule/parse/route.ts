import { NextResponse } from "next/server";
import { geminiConfigured, readTimetable } from "@/lib/gemini";

/** Timetable screenshot → rows. The image is not stored; rows go back to the phone for confirmation. */
export async function POST(req: Request) {
  if (!geminiConfigured()) return NextResponse.json({ error: "off", message: "Screenshot import isn't switched on yet. Add classes by hand or import a .ics file." }, { status: 503 });
  const { image } = (await req.json().catch(() => ({}))) as { image?: string };
  if (!image || image.length > 3_000_000) return NextResponse.json({ error: "no-image", message: "Pick a screenshot first." }, { status: 400 });
  try {
    return NextResponse.json({ rows: await readTimetable(image.replace(/^data:image\/\w+;base64,/, "")) });
  } catch (err) {
    console.error("readTimetable", err);
    return NextResponse.json({ error: "failed", message: "Couldn't read that timetable. Try a clearer screenshot." }, { status: 502 });
  }
}
