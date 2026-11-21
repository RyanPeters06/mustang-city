# Feature Specification: The Goose Quest-giver

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Backlog — original goose crime-boss portrait (SVG, original art) on mission briefings; Gemini rewrites
briefings in character from stored text (fallback to stored text). Brief → Extended: "Goose boss quest-giver".

## User stories
1. **As a player opening a mission**, I see The Goose's portrait next to the briefing, so missions feel handed
   out by a character, not a list.
   - Given any mission sheet, when it opens, then the portrait and the stored briefing show immediately.
2. **As a player with Gemini switched on**, the briefing is re-voiced in The Goose's crime-boss voice.
   - Given `GEMINI_API_KEY` is set, when the sheet opens, then the stored briefing is swapped for the in-character
     rewrite once it arrives (no layout jump, no spinner blocking the mission).
   - Given no key, a Gemini error, or a rewrite that fails the guard, then the stored briefing stays.

## Requirements
- FR-001 Portrait is original inline SVG art (goose head, fedora, aviator shades, gold chain); no third-party IP.
- FR-002 `GET /api/missions/briefing?slug=` returns `{ text, source: "gemini" | "stored" }`; key used server-side only.
- FR-003 Accuracy guard: Gemini receives only the stored briefing + title; it may restyle but MUST NOT add facts.
  Server rejects a rewrite that contains digits not in the stored text, is over 220 chars, or is empty → stored text.
- FR-004 Rewrites cached in server memory per slug (one Gemini call per mission per instance) and in the
  client per session.
- FR-005 Landmark lore (`brief`, sources) is never sent to or changed by Gemini.

## Edge cases
- Unknown slug → 404 JSON. Slow Gemini → stored text stays; rewrite fades in when ready (5 s timeout).
- Offline → fetch fails silently; stored text stays.

## Success criteria
- Every mission sheet shows the portrait; with no key, briefing text equals `lib/missions.ts` exactly.
- Build, lint, typecheck pass; core six smoke-checked.
