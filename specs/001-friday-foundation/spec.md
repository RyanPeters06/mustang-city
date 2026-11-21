# Feature Specification: Friday-Night Foundation

**Feature Branch**: `main` (solo hackathon; no feature branch)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Friday-night foundation for Mustang City, per docs/product-brief.md. Installable iPhone PWA shell with phone frame on laptops; full-screen sunset-styled 3D map of London (Forest State) with branded loading; 2D/45° city view easing to detailed 3D over Western campus (Mustang City); first pass of the black fog with local/demo reveal; @uwo.ca-only login; database schema and seed with verified landmark missions; app shell with top HUD and bottom tab bar. Degrade gracefully when configuration is missing. Out of scope: photo verification, friends, replay, extended features."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the app and see Forest State under fog (Priority: P1)

A Western student adds Mustang City to their iPhone home screen and opens it. A branded loading
screen shows until the map is fully drawn, then a full-screen, tilted, sunset-lit map of London
appears. Every area they haven't explored is covered in black fog; a cleared patch around
their location (or a demo starting area) shows the city beneath. A top HUD shows Rep, rank and
% explored; a bottom tab bar offers Map, Missions, Crew and Profile.

**Why this priority**: This is the product's one image ("black fog clearing as you walk") and
the first thing judges see. Everything else builds on it.

**Independent Test**: Open the deployed URL on an iPhone home-screen icon and on a laptop;
confirm the loader, the fogged 3D sunset map, the HUD and the tab bar appear, and that a demo
reveal clears fog and raises % explored.

**Acceptance Scenarios**:

1. **Given** the app is opened from the home-screen icon, **When** it launches, **Then** it fills
   the screen edge to edge (no browser chrome), with HUD and tab bar clear of the notch and home bar.
2. **Given** the app is opened on a laptop browser wider than 768 px, **When** it loads, **Then** the
   identical phone layout is shown in a centered phone-shaped frame on a sunset backdrop.
3. **Given** the map is still loading, **When** the user waits, **Then** only the branded loading
   screen is visible — never a half-drawn map.
4. **Given** the map has loaded, **When** the user looks at it, **Then** it is tilted (~45°), uses
   the sunset palette with lighting matching London's current time of day, shows a horizon glow,
   shows no point-of-interest or transit clutter, and has no default map controls.
5. **Given** the user has explored nothing, **When** the map loads, **Then** all of London is
   covered in solid black fog except the revealed area, with soft edges.
6. **Given** location permission is granted (or the demo reveal is triggered), **When** a new
   position is received, **Then** fog clears around it and % explored in the HUD increases.

---

### User Story 2 - Zoom into Mustang City in 3D (Priority: P1)

From the city view the student zooms toward Western's campus. Once close enough over campus,
the camera smoothly tilts further into a detailed 3D view where campus buildings are highlighted
and mission buildings (e.g. Middlesex College) glow. Zooming back out eases back to the city view.

**Why this priority**: The brief names this the main wow moment of the demo and says to build
it first.

**Independent Test**: On the deployed app, pinch/scroll into campus and back out; confirm the
eased tilt change, highlighted buildings, and return to the city view, with no jumps.

**Acceptance Scenarios**:

1. **Given** the city view, **When** the user zooms past street level inside the campus area,
   **Then** the camera eases to ~60° pitch and campus buildings appear highlighted in 3D.
2. **Given** the campus 3D view, **When** the user zooms out or pans away from campus, **Then** the
   camera eases back to the ~45° city pitch.
3. **Given** any camera change, **When** it happens, **Then** it is animated (no instant jump).

---

### User Story 3 - Sign in with a Western account (Priority: P2)

The student taps Profile and signs in. Only @uwo.ca accounts are accepted; anyone else is
refused with a clear message. Once signed in, the profile tab shows their name and email, and
they can sign out.

**Why this priority**: Required for profiles, friends and missions tomorrow, and for the Auth0
track, but the map demo works without it.

**Independent Test**: Sign in with a @uwo.ca account from the home-screen app and see the profile;
attempt a non-@uwo.ca account and see it refused.

**Acceptance Scenarios**:

1. **Given** a signed-out user, **When** they tap Sign in and use a @uwo.ca account, **Then** they
   return to the app signed in and the Profile tab shows their identity.
2. **Given** a non-@uwo.ca account, **When** they try to sign in, **Then** access is denied with an
   explanation that only Western accounts are allowed.
3. **Given** a signed-in user, **When** they sign out, **Then** they return to the signed-out state.
4. **Given** login is not configured in an environment, **When** the user opens Profile, **Then** the
   app shows a "sign-in unavailable" state and the map keeps working.

---

### User Story 4 - Game data foundation (Priority: P2)

The builder can create the full game database (users, location history, revealed areas,
neighbourhoods, missions, completions, heists, friendships, crews, tags, collectibles, badges,
votes, rides, district control) with one command and seed it with the verified landmark missions,
starter missions and badges, so missions and progression can be built tomorrow.

**Why this priority**: Unblocks Saturday's mission and progression work; not visible in tonight's demo.

**Independent Test**: Run the schema and seed commands against an empty database; confirm all
tables exist, location history is time-partitioned, per-user explored counts can be queried, and
the seeded missions and badges are present. Re-running the seed does not duplicate rows.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** the schema command runs, **Then** every table in the brief's
   data model exists with its keys and constraints.
2. **Given** the schema exists, **When** the seed runs twice, **Then** the 6 verified landmark
   missions, 10–15 starter missions and 6 starter badges exist exactly once.

---

### Edge Cases

- Location permission denied or unavailable (laptop, indoors): the map still loads; fog shows the
  default campus reveal; demo controls can reveal areas.
- Location fixes with poor accuracy (> ~50 m) or implying impossible speed are ignored.
- Map token missing: the app shows a branded "map unavailable" state instead of crashing.
- Slow network: the loader stays until the map is ready; a long wait shows a retry hint.
- Laptop window resized: the phone frame rescales and the map redraws to fit without distortion.
- User has reduced-motion enabled: camera and UI transitions are shortened.
- Position outside London: no fog is cleared (only cells inside the city count).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: App MUST be installable to the iPhone home screen and launch full screen in portrait
  with the sunset theme and a branded icon.
- **FR-002**: On screens wider than 768 px the app MUST render the same layout inside a centered
  phone frame (~430×932 aspect), scaled to fit the window height.
- **FR-003**: App MUST show a branded loading screen until the map has finished its first full draw.
- **FR-004**: The map MUST show London in 3D at ~45° pitch with the sunset palette, horizon glow,
  lighting by London local time (day / dusk / night), and with POI labels, transit labels and
  default controls hidden. District names remain visible.
- **FR-005**: When zoomed past street level within the Western campus area, the camera MUST ease
  to ~60° pitch with campus buildings highlighted and mission buildings emphasised; leaving that
  zoom or area MUST ease back to ~45°.
- **FR-006**: All camera changes MUST be animated.
- **FR-007**: Unexplored parts of London MUST be covered in solid black fog; explored areas
  (~65 m hex cells) MUST be clear with a soft edge.
- **FR-008**: While the app is open and permission is granted, each accepted location fix MUST
  reveal the current cell and its immediate neighbours; fixes worse than ~50 m accuracy or
  implying impossible speed MUST be ignored.
- **FR-009**: Revealed cells MUST persist on the device across app restarts (server persistence is
  a later feature).
- **FR-010**: The HUD MUST show Rep, rank and % of London explored, updating when fog clears.
- **FR-011**: A bottom tab bar MUST provide Map, Missions, Crew and Profile; non-Map tabs MAY show
  "coming soon" placeholders tonight.
- **FR-012**: A hidden demo control (keyboard shortcut on laptops) MUST allow revealing fog along a
  path or at a point without live GPS.
- **FR-013**: Sign-in MUST accept only @uwo.ca accounts and refuse others with a clear message.
- **FR-014**: Signed-in users MUST be able to see their identity on Profile and sign out.
- **FR-015**: The database schema MUST cover every table in the brief's data model, keep location
  history time-partitioned, and provide a per-user explored-cell count summary.
- **FR-016**: A repeatable seed MUST load the 6 verified landmark missions (with category, brief,
  year, source link), 10–15 starter missions and the 6 starter badges.
- **FR-017**: Any feature whose configuration is missing (map token, login, database) MUST hide or
  show an unavailable state without breaking the rest of the app.
- **FR-018**: No Rockstar/GTA names, logos or art may appear anywhere in the app.

### Key Entities

- **Player**: a Western student; identity, faculty, Rep, rank.
- **Revealed cell**: a ~65 m hex area a player has cleared; first and last visit times.
- **Location ping**: a timestamped position fix with accuracy; source for reveal and replay.
- **Neighbourhood / district**: a named area of London or campus zone made of cells.
- **Mission**: a task at a place (photo, check-in, bus, heist), with reward and criteria;
  landmark missions add category, brief, year and source link.
- **Badge**: a named achievement with a code and description.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On campus Wi-Fi the map is usable within 3 seconds of opening the app.
- **SC-002**: Panning, zooming and tilting show no visible stutter on an iPhone or in the laptop frame.
- **SC-003**: The zoom from city view into campus 3D and back completes smoothly in under 1.5 seconds each way.
- **SC-004**: 100% of non-@uwo.ca sign-in attempts are refused; a @uwo.ca sign-in round trip from the home-screen app completes in under 30 seconds.
- **SC-005**: A simulated walk across campus visibly clears fog and increases % explored within 1 second of each new position.
- **SC-006**: Layout has no clipped or overlapping UI at 375 pt and 440 pt widths and in the laptop frame.
- **SC-007**: The database can be created and seeded from scratch in under 2 minutes with one command each.

## Assumptions

- The London city boundary is approximated by a simplified polygon stored in the app; precise
  municipal boundary data can replace it later.
- Before sign-in and server persistence exist, revealed cells are stored only on the device.
- The default reveal for a new device is a small area at the centre of Western campus so the demo
  never opens to a fully black screen.
- Lighting presets switch by fixed London-time windows tonight; sunset-accurate timing is an
  extended feature.
- The @uwo.ca restriction is enforced in the login provider (rule/action) and re-checked by the app.
- Database is Tiger Data (Postgres + TimescaleDB); the builder supplies the connection string.
- Non-Map tabs are placeholders tonight; missions, friends and replay arrive in later features.
