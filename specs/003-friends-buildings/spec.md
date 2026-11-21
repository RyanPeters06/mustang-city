# Feature Specification: Friends & Campus Buildings

**Created**: 2026-11-21 · **Status**: Draft · **Branch**: `main`

**Input**: "Do friends next" (brief → Core feature 5: add friends by username or QR, compare % explored,
missions and rank, show a friend's fog map) and "press a Western building → highlight it and show data
(history, quests in the building, classes), ideally with real building models".

## User Scenarios & Testing

### US1 - Add a friend (P1)
A signed-in student opens Crew, sees their handle and a QR code, and adds a friend by typing the friend's
handle or by the friend scanning their QR (a link that opens Crew with the handle filled in). The friend
sees a request and accepts it.
**Test**: two @uwo.ca accounts; A adds B by handle; B accepts; both see each other.

### US2 - Compare with a friend (P1)
Each friend card shows rank, Rep, % explored and missions side by side with the player's own numbers.
"Show their map" tints the areas the friend has cleared on the player's map in the friend's accent colour.
**Test**: open a friend, compare numbers, toggle their map on and off.

### US3 - Explore a campus building (P2)
Tapping a Western building highlights it and opens a card with its name, a short sourced history (when an
article exists), missions in or near it, and a "Classes here — coming with Class Run" placeholder.
**Test**: tap Middlesex College → gold highlight, card with Wikipedia summary + source link + its missions.

### Edge cases
- Not signed in / DB not configured: Crew shows a clearly labelled demo crew so the comparison UI can still
  be shown, plus the sign-in call to action. Demo friends never mix with real ones.
- Unknown handle → "No Mustang with that handle". Adding yourself → refused. Duplicate request → no-op.
- Friend's map is only visible to accepted friends (server-enforced).
- Building with no matched name → "Unnamed building"; no article → history section hidden (never invented).

## Requirements
- **FR-001** Every signed-in player has a unique handle derived from their display name (lowercase, `a-z0-9._-`, 3–20; suffix digits on clash).
- **FR-002** Device progress (profile, revealed cells, mission completions) syncs to the account when signed in and the DB is configured.
- **FR-003** Add friend by handle; QR encodes `https://<site>/?add=<handle>`; opening it opens Crew with the handle filled in.
- **FR-004** Requests can be accepted or declined; accepted friends can be removed.
- **FR-005** Friend list shows emblem, name, faculty, rank, Rep, % explored, missions; compare view shows player vs friend.
- **FR-006** Friend fog map: accepted friends can load each other's revealed cells; shown as a tinted overlay, toggleable, one friend at a time.
- **FR-007** Tapping a campus building highlights it in 3D and opens a building card.
- **FR-008** Building card: name, sourced history (Wikipedia summary + link) when available, missions within 75 m, Class Run placeholder.
- **FR-009** Everything degrades without Auth0/DB (demo crew, building cards still work).

## Success Criteria
- **SC-001** Adding a friend by handle takes under 15 seconds.
- **SC-002** Friend fog overlay appears within 2 seconds of tapping "Show their map".
- **SC-003** Building highlight + card appear within 300 ms of the tap (history may load after).

## Profile/privacy notes
Live location is never shared. Only revealed cells (where you've been, not when) are visible, and only to
accepted friends — matches the brief's privacy answer.

## Real building models (research, not in this feature)
See [research.md](research.md).
