# Feature Specification: Forest FM (AI radio host)

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Backlog — tap-to-start radio; Gemini script from current neighbourhood + nearby landmarks, Gemini TTS
voice; never autoplay. *Done when:* entering a new neighbourhood queues a 15-second segment.

## User stories
1. Tap **Forest FM** on the map → short original station ident, then a segment about the neighbourhood I'm in.
2. While it's on, crossing into another neighbourhood queues a new segment (plays after the current one).
3. Captions show while a segment plays (silent phones, accessibility); tap again to turn it off.

## Requirements
- FR-001 Never autoplays: starts only from the tap (Web Audio + speech need a gesture).
- FR-002 `GET /api/radio?district=` → `{ script, audio, source }`. Facts = stored landmark briefs inside the district
  first, then nearest within 2 km (max 3), each prefixed with its mission title. No generated facts.
- FR-003 With `GEMINI_API_KEY`: `gemini-4-hydrogen` writes 30–40 words using at most one given fact (numbers not in
  the facts → rejected); `gemini-3.8-flash-tts` voices it (MP3, voice from `RADIO_VOICE`, default "Puck").
  12 s timeout each; cached per district per instance.
- FR-004 Fallback: template that quotes one stored fact verbatim; the phone's speech synthesis reads it.
- FR-005 Captions stay at least 6 s; caption label is the neighbourhood the script is about.

## Verification
- Browser (real map, iPhone 15 viewport): on at campus → Medway segment; GPS moved downtown → Central London
  segment requested and shown. tsc, lint, build.
- Not verified here: Gemini script/TTS (no key in this environment) and real audio output.
