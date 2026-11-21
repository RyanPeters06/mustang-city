import "server-only";
import { GoogleGenAI } from "@google/genai";

export type Verdict = { pass: boolean; confidence: number; reason: string };

const MODEL = "gemini-4-hydrogen";
export const geminiConfigured = () => !!process.env.GEMINI_API_KEY;

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    pass: { type: "boolean", description: "true if the photo satisfies the mission criteria" },
    confidence: { type: "number", description: "0 to 1, how sure you are" },
    reason: { type: "string", description: "one short, friendly sentence for the player" },
  },
  required: ["pass", "confidence", "reason"],
};

/**
 * Check a mission photo against its plain-language criteria.
 * Lenient by design (brief → Risks): real phone photos are messy, so judge the subject, not the quality.
 */
export async function verifyPhoto(criteria: string, jpegBase64: string): Promise<Verdict> {
  const prompt = [
    "You are the referee for a campus exploration game. A player took this photo to complete a mission.",
    `Mission criteria: ${criteria}`,
    "Decide if the photo plausibly satisfies the criteria. Be lenient about blur, lighting, angle, framing",
    "and partial views; fail only if the required subject is clearly absent, the image is a screenshot of",
    "another photo or screen, or it is unrelated. Do not invent facts about the place.",
    "Reply as JSON: pass, confidence (0-1), reason (one short sentence addressed to the player).",
  ].join("\n");

  const interaction = await ai().interactions.create({
    model: MODEL,
    input: [
      { type: "text", text: prompt },
      { type: "image", data: jpegBase64, mime_type: "image/jpeg" },
    ],
    response_format: { type: "text", mime_type: "application/json", schema: VERDICT_SCHEMA },
    generation_config: { thinking_level: "low" },
    store: false,
  });

  const parsed = JSON.parse(interaction.output_text ?? "{}") as Partial<Verdict>;
  return {
    pass: parsed.pass === true,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "No reason given.",
  };
}

const BRIEFING_SCHEMA = {
  type: "object",
  properties: { text: { type: "string", description: "the rewritten briefing, 1–2 sentences" } },
  required: ["text"],
};

/**
 * Re-voice a stored mission briefing as The Goose (brief → Accuracy rule: style only, no new facts).
 * Returns null when the rewrite fails the guard, so callers fall back to the stored text.
 */
export async function rewriteBriefing(title: string, briefing: string): Promise<string | null> {
  const prompt = [
    "You are The Goose, an original crime-boss goose who hands out missions in a campus exploration game.",
    "Voice: smooth, menacing-but-friendly mob boss; short sentences; a little honk energy; PG, no profanity.",
    `Mission title: ${title}`,
    `Stored briefing: ${briefing}`,
    "Rewrite the stored briefing in your voice, 1–2 sentences, under 200 characters.",
    "Use ONLY information in the stored briefing. Do not add names, dates, numbers, places or facts.",
    "Keep the same instruction to the player. Reply as JSON: text.",
  ].join("\n");

  const interaction = await ai().interactions.create({
    model: MODEL,
    input: [{ type: "text", text: prompt }],
    response_format: { type: "text", mime_type: "application/json", schema: BRIEFING_SCHEMA },
    generation_config: { thinking_level: "low" },
    store: false,
  });

  const text = (JSON.parse(interaction.output_text ?? "{}") as { text?: unknown }).text;
  return typeof text === "string" && briefingPassesGuard(briefing, text) ? text.trim() : null;
}

/** Reject rewrites that are empty, too long, or contain digits the stored text doesn't. */
export function briefingPassesGuard(stored: string, rewrite: string): boolean {
  const t = rewrite.trim();
  if (!t || t.length > 220) return false;
  const storedNums = new Set(stored.match(/\d+/g) ?? []);
  return (t.match(/\d+/g) ?? []).every((n) => storedNums.has(n));
}

const SCREEN_SCHEMA = {
  type: "object",
  properties: {
    ok: { type: "boolean", description: "true if safe to show publicly in the game" },
    reason: { type: "string", description: "if not ok, one short sentence for the author" },
  },
  required: ["ok", "reason"],
};

/** Screen a public geo-pinned tag (note + optional photo) before it is stored. */
export async function screenTag(note: string, jpegBase64?: string): Promise<{ ok: boolean; reason: string }> {
  const prompt = [
    "You moderate public notes and photos students pin to places in a campus exploration game.",
    `Note: ${note}`,
    "Reject if it contains: harassment or insults aimed at a person, hate, sexual content, threats, encouragement",
    "of illegal or dangerous acts, personal information (names with contact details, addresses of private homes,",
    "student numbers), or a photo where a stranger's face is the subject. Allow jokes, opinions, tips and art.",
    "Reply as JSON: ok, reason.",
  ].join("\n");
  const input: ({ type: "text"; text: string } | { type: "image"; data: string; mime_type: string })[] = [{ type: "text", text: prompt }];
  if (jpegBase64) input.push({ type: "image", data: jpegBase64, mime_type: "image/jpeg" });

  const interaction = await ai().interactions.create({
    model: MODEL,
    input,
    response_format: { type: "text", mime_type: "application/json", schema: SCREEN_SCHEMA },
    generation_config: { thinking_level: "low" },
    store: false,
  });
  const parsed = JSON.parse(interaction.output_text ?? "{}") as { ok?: unknown; reason?: unknown };
  return { ok: parsed.ok === true, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 160) : "" };
}

const TTS_MODEL = "gemini-3.8-flash-tts";

/** ~15-second radio-host segment from stored, sourced facts only (brief → Accuracy rule). */
export async function writeRadioScript(district: string, facts: string[]): Promise<string | null> {
  const prompt = [
    "You are the late-night host of Forest FM, an original radio station in a campus exploration game set in",
    "London, Ontario (called Forest State in the game; Western's campus is Mustang City).",
    "Write ONE spoken segment, 30–40 words (about 15 seconds), warm and a little dramatic, no hashtags or emoji.",
    `The listener just entered the neighbourhood: ${district}.`,
    facts.length ? `Facts you may use (use at most one, word it naturally, add nothing):\n- ${facts.join("\n- ")}` : "No facts available: just welcome them and tease exploring.",
    "Never invent names, dates, numbers or events. Reply with the segment text only.",
  ].join("\n");
  const interaction = await ai().interactions.create({
    model: MODEL,
    input: [{ type: "text", text: prompt }],
    generation_config: { thinking_level: "low" },
    store: false,
  });
  const text = interaction.output_text?.trim();
  if (!text || text.length > 400) return null;
  // Same idea as the briefing guard: no numbers that aren't in the facts.
  const allowed = new Set((facts.join(" ") + " " + district).match(/\d+/g) ?? []);
  return (text.match(/\d+/g) ?? []).every((n) => allowed.has(n)) ? text : null;
}

/** Voice a script with Gemini TTS. Returns base64 audio + mime type, or null. */
export async function speak(script: string): Promise<{ data: string; mime: string } | null> {
  const interaction = await ai().interactions.create({
    model: TTS_MODEL,
    input: [{ type: "text", text: script }],
    response_format: { type: "audio", mime_type: "audio/mp3" },
    generation_config: { speech_config: [{ voice: process.env.RADIO_VOICE || "Puck", language: "en-US" }] },
    store: false,
  });
  const audio = interaction.output_audio;
  return audio?.data ? { data: audio.data, mime: audio.mime_type ?? "audio/mp3" } : null;
}
