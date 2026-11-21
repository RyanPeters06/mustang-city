# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

All Western University students, equally — not only first-years. They use Mustang City on an
iPhone, launched from the home-screen icon, mostly outdoors: walking across campus, through London
neighbourhoods, or riding LTC buses, often in bright sunlight and one-handed. Secondary audiences:
friend groups (crews), faculties competing for districts, and hackathon judges watching the same
phone screen in a laptop phone frame.

## Product Purpose

Students stay in a small loop (campus, Richmond Row, one or two bus routes) for four years.
Mustang City turns London, Ontario into "Forest State", a map covered in black fog that clears only
where the student has physically been, and gives them reasons, routes and company to leave the
bubble: AI-verified photo missions, bus rides, hidden collectibles and co-op heists. Success is
% of London explored, neighbourhoods unlocked, missions completed, and heists done with people the
student didn't already know. Tagline: "Graduate knowing your city."

## Positioning

Exploration trackers only record where you've been. Mustang City is built for Western: the fog is
the game board, and missions verified by GPS + Gemini vision, faculty turf wars, bus missions and
multi-person heists turn exploring into a social, competitive open-world game. GTA 6-inspired in
feel, entirely original in names and assets.

## Operating Context

- Installed as a PWA from Safari (Share → Add to Home Screen); no background GPS, so fog clears
  only while the app is open.
- Live demo at Hack Western 13 (Nov 20–22, 2026) runs on a laptop in a phone frame with replay mode
  and hidden demo controls (press D); the real iPhone and a recorded video are backups.
- Map is always full screen; all UI floats over it. Portrait only.

## Capabilities and Constraints

- Core six (never cut): black-fog map, 2D→3D zoom into Mustang City, photo missions with Gemini
  verification, @uwo.ca-only login and profiles, friends, replay mode.
- Extended features follow the brief's build order (time-of-day palette, goose boss, tags, AI radio,
  Wrapped, live buses, turf, heists…).
- Future (post-core): Class Run, where students import their schedule, get waypoints to class
  buildings and earn Rep for arriving on time. Design in `docs/roadmap.md`.
- Profiles are a trophy case: curated emblems/accents unlocked by progress, no uploaded avatars
  or free-text bios; never shows live location (scope in `specs/002-missions-profiles/spec.md`).
- Terminology: London = Forest State; Western campus = Mustang City; Rep (single currency); ranks
  Frosh → Local → Made → Legend of Forest State; quest-giver = The Goose; mission result moment =
  "MISSION PASSED".
- Constraints: solo 36-hour build; 60 fps map on iPhone; secrets server-side; laptop frame must be
  identical to the phone UI. Neighbourhood boundary source is undecided.

## Brand Commitments

- Name: Mustang City (product and in-game campus); Forest State (London).
- Voice: playful crime-boss. The Goose speaks like a deadpan open-world quest-giver; UI copy is
  short and cheeky, never mean.
- Never use Rockstar/GTA names (Leonida, Vice City), logos, wordmarks, screenshots, art, characters
  or music. Public copy may say "GTA 6-inspired" only.
- Binding palette from the brief: night #140A2E, fog #000000, pink #FF4F8B, orange #FF8A3D,
  gold #FFC857, purple #7B2FF7, teal #2EE6D6 (teal = you, friends, buses).

## Evidence on Hand

- Verified landmark facts with sources: `docs/product-brief.md` → Landmark missions, seeded in
  `db/seed.sql`.
- No testimonials, user counts, sponsor deals or press exist yet; sponsored missions are a pitch,
  not a fact. Viral-video spots are unseeded until each location is confirmed from a reliable source.

## Product Principles

1. The fog is the product: every screen serves uncovering the city.
2. Demo-proof: every core moment works without live GPS or a camera.
3. Real places, real facts: landmark text comes from stored, sourced facts; AI restyles, never invents.
4. Get students out together: features that create meetings (heists, crews, turf) beat solo stats.
5. Phone first, always: what the iPhone shows is what the judges see.

## Accessibility & Inclusion

Readable outdoors in direct sunlight (WCAG AA contrast minimum on all text over the map),
reduced-motion support for camera and UI animation, 44 pt tap targets, 16 px+ inputs.
Privacy by default: live location sharing off unless opted in, blurred to neighbourhood level.
