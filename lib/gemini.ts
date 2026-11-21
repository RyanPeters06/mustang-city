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
