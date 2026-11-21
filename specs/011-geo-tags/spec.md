# Feature Specification: Geo-pinned Tags

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Backlog — leave a note/photo on your current cell; others see it once their fog there is cleared;
upvotes (+10 Rep). Brief → Extended "Geo-pinned tags"; data model `tags`; Rep table "Your tag gets upvoted: 10".

## User stories
1. **Pin a tag** — standing somewhere with good GPS (±50 m), I tap the tag button on the map, write ≤140 chars
   (optional photo) and pin it to my current H3 res-11 cell.
2. **Discover tags** — a tag by player A appears for player B only after B has revealed that cell.
3. **Upvote** — B upvotes A's tag once; A gets +10 Rep. B can undo. Nobody upvotes their own tag.
4. **Manage** — my tags and the ones I've found are listed on Profile; I can delete my own.

## Acceptance
- Given A pinned a tag in cell X and B has not revealed X, when B loads tags, then the tag is absent (server gate:
  `revealed_cells` join in `GET /api/tags`). After B reveals X and syncs, it appears.
- Given B upvotes, then `tag_votes` gets one row, `tags.votes` +1, A's Rep +10 (also counted in `/api/me` recompute).

## Requirements
- FR-001 Cell is computed server-side from the fix; GPS accuracy must be ≤ 50 m.
- FR-002 Privacy: notes with links, emails or phone numbers are rejected (client + server). Only cells, never traces.
- FR-003 With `GEMINI_API_KEY`, every tag is screened (harassment, hate, personal info, strangers' faces).
  Photo tags require screening; without a key, photos are refused and notes still post.
- FR-004 Max 20 tags / player / day; photo ≤ 120 KB thumbnail.
- FR-005 Degrades: signed out or no DB → "local" mode — tags stay on this phone, plus three labelled sample tags
  on the demo walk, each shown only once local fog over it is cleared.
- FR-006 Map: one symbol layer (`tag-pins`) from a GeoJSON source, z ≥ 13; tap opens the tag sheet.

## Success criteria
- Local mode verified in browser: sample tag hidden until walked to; posting, link rejection, upvote, Profile list.
- Server mode needs DB + Auth0 (not available in the build container) — verify with two accounts once configured.
