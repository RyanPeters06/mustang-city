# Feature Specification: Missions & Profiles

**Feature Branch**: `main` (solo hackathon)

**Created**: 2026-11-21

**Status**: Draft

**Input**: "Keep going on the requirements" — the brief's Saturday-morning phase (mission pins and cards,
seed missions, photo flow with GPS radius + Gemini verification + MISSION PASSED, profile page with
completed missions and photos), plus a decision on how profiles work and how customizable they are.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find a mission (Priority: P1)

A student opens Missions and sees cards (title, type, category, Rep, distance, status). Missions also
appear as blips on the map. Landmark missions whose spot is still under fog show only an approximate
area; once the fog there is cleared, the exact blip appears. Tapping a card flies the camera to it and
opens a detail sheet with The Goose's briefing; "Set waypoint" draws a glowing walking route with
distance and minutes.

**Independent Test**: open Missions, tap a card, see the camera fly, the briefing, and the route.

**Acceptance Scenarios**:
1. **Given** the map, **When** it loads, **Then** mission blips show, styled by type, with completed ones dimmed.
2. **Given** a landmark mission in an unexplored area, **When** viewing the map, **Then** only an approximate area ring shows.
3. **Given** a mission card, **When** tapped, **Then** the camera flies to it and the detail sheet opens.
4. **Given** the detail sheet, **When** "Set waypoint" is tapped, **Then** a walking route, distance and minutes appear.

### User Story 2 - Complete a mission (Priority: P1)

At the spot, the student completes it: check-in missions complete on arrival; photo missions open the
camera, the photo is checked against the mission criteria, and on success a big "MISSION PASSED" moment
plays with the Rep earned. Landmark missions then show the lore card (brief, year, source link).

**Independent Test**: from inside the radius (real GPS or demo walk), complete a check-in and a photo
mission end to end in under 30 seconds.

**Acceptance Scenarios**:
1. **Given** the player is outside the radius, **When** they try to complete, **Then** they see how far away they are.
2. **Given** a photo that matches the criteria, **When** submitted, **Then** MISSION PASSED plays and Rep increases.
3. **Given** a photo that doesn't match, **When** submitted, **Then** the reason is shown and they can retry.
4. **Given** verification is unavailable, **When** submitting, **Then** a clear message shows and nothing is lost.
5. **Given** a landmark mission completed, **Then** its lore card is added to the Archive.

### User Story 3 - My profile (Priority: P2)

The Profile tab shows the student's identity, rank, Rep, % explored, missions completed with photos,
Archive and badges. They can customize name, faculty, emblem, accent colour and a showcase.

**Independent Test**: complete a mission, open Profile, see it with its photo; change emblem and colour.

## Profile design & customization scope (decision)

**Principle:** profiles are a *trophy case*, not a social feed. Customization is a reward for exploring,
kept within the game's art direction, and nothing on a profile can reveal where someone is right now.

| Tier | What | When |
|---|---|---|
| **Identity** (editable) | Display name (3–20 chars, unique handle for friend adds), faculty (required — drives turf wars), year (optional) | Now |
| **Look** (editable, curated) | Emblem from an original icon set (mustang, goose, owl, compass, bus, crown…), accent colour from the 6 palette colours | Now: 4 starter emblems + all colours; more emblems unlock with rank/badges |
| **Title** (earned) | Shown under the name, chosen from badges earned ("Goose Whisperer", "Cartographer") | When badges ship |
| **Showcase** (curated) | Pin up to 3 completed-mission photos or badges to the top | Now (photos) |
| **Stats** (not editable) | Rank, Rep, % explored, neighbourhoods unlocked, missions, km walked, new places this week | Now: rank, Rep, %, missions |
| **Archive** (earned) | Lore cards from landmark missions | Now |
| **Privacy** | Fog map visible to: friends (default) / everyone / no one; profile visible to signed-in Western students only; never live location | Settings arrive with Friends |

**Deliberately excluded:** uploaded profile pictures and free-text bios (moderation load and privacy risk
in a 36-hour build; emblems keep the GTA-style card look consistent). A short tagline can be added later
with Gemini screening.

## Edge Cases

- No GPS fix yet: completion button explains location is needed (demo walk works on laptops).
- Weak GPS (> 50 m): completion blocked with "GPS too rough" — same rule as fog.
- Photo too large / HEIC: client converts to JPEG ≤ 1080 px before upload.
- Offline or verification service down: photo kept in the sheet; retry possible.
- Already completed: card shows "Done" with the photo; can't earn Rep twice.
- Signed out: progress is kept on the device; it syncs to the account when they sign in (DB configured).

## Requirements *(mandatory)*

- **FR-001**: Show all active missions as map blips by type; completed blips dimmed; landmark blips in fogged areas shown as approximate area rings.
- **FR-002**: Missions list sorted by distance when location is known, showing type, category, Rep, distance and status.
- **FR-003**: Tapping a mission flies the camera to it and opens a detail sheet with briefing, criteria, reward and actions.
- **FR-004**: "Set waypoint" draws a walking route with distance and minutes; one waypoint at a time; clearable.
- **FR-005**: Completion requires an accepted fix (≤ 50 m accuracy) within the mission radius.
- **FR-006**: Check-in missions complete on arrival via the completion button.
- **FR-007**: Photo missions capture a photo (camera on phone, file picker on laptop), resize to ≤ 1080 px JPEG, and verify server-side against the mission criteria; pass = `pass && confidence ≥ 0.6`.
- **FR-008**: On pass, play MISSION PASSED (animation + sound, no haptics), award the mission's Rep once, and save the completion with a thumbnail.
- **FR-009**: Landmark completions add a lore card (brief, year, source link) to the Archive; text comes only from stored facts.
- **FR-010**: Profile shows identity, emblem, accent, rank, Rep, % explored, mission count, showcase, completed missions, Archive.
- **FR-011**: Profile customization: name, faculty, year, emblem (from unlocked set), accent colour, showcase pins.
- **FR-012**: Progress persists on the device; when signed in and the database is configured, completions and profile save to the account.
- **FR-013**: Missing Gemini / storage / database config degrades to a clear message without breaking the map.
- **FR-014**: Hidden demo controls can trigger MISSION PASSED and teleport to a mission.

### Key Entities
- **Mission** (existing): adds a computed `distance` and per-player `status`.
- **Completion**: mission, time, thumbnail, verification reason, Rep.
- **Profile**: display name, faculty, year, emblem, accent, showcase ids.

## Success Criteria *(mandatory)*

- **SC-001**: A photo mission completes end to end in under 30 seconds on campus Wi-Fi.
- **SC-002**: MISSION PASSED appears within 300 ms of a pass response.
- **SC-003**: 100% of attempts outside the radius are refused with the distance shown.
- **SC-004**: Mission list and blips stay smooth (no visible stutter) with 20+ missions.

## Assumptions

- Missions are bundled with the app (mirroring db/seed.sql) so the demo never depends on the DB; DB-backed listing arrives with student-written missions.
- Photos are sent to the server already compressed (≤ ~500 KB), well under the platform's request limit;
  object storage is used for the saved photo when configured.
- Walking routes use the map provider's directions service with the public map token.
- Badges, titles, friends and privacy settings ship in later features; the profile reserves space for them.
