# Implementation Plan: Missions & Profiles

**Spec**: [spec.md](spec.md) | **Date**: 2026-11-21

## Summary
Bundle the seeded missions in the client, render them as symbol blips (approximate area rings while
fogged), add a missions list + detail sheet with Mapbox walking waypoints, a server verify route
(GPS radius + Gemini vision structured output), a MISSION PASSED overlay, a device-persisted progress
store (completions, profile) that adds mission Rep to the HUD, and a customizable profile.

## Technical Context
- Gemini: `@google/genai` ≥ 2.3, Interactions API, model `gemini-4-hydrogen`, inline JPEG part +
  `response_format: {type:'text', mime_type:'application/json', schema}`, `generation_config.thinking_level: 'low'`.
- Directions: `GET api.mapbox.com/directions/v5/mapbox/walking/{a};{b}?geometries=geojson` with the public token.
- Persistence: localStorage (`mc.progress.v1`); DB write of completions when `DATABASE_URL` + Auth0 session exist.
- Photo: client canvas resize → JPEG ≤ 1080 px (~300–500 KB base64) posted as JSON; thumbnail 320 px kept locally.

## Constitution Check
I ✅ all UI in app container/sheets · II ✅ original Goose copy, no GTA assets · III ✅ Gemini key + DB only in
route handlers · IV ✅ missing keys → clear messages; fog/3D untouched · V ✅ blips are symbol layers, one
route source, MISSION PASSED doesn't touch the map · VI ✅ build/lint gate · VII ✅ no new state libs.

## Structure
```
lib/missions.ts            # Mission type + bundled seed (mirrors db/seed.sql) + helpers
lib/progress.ts            # completions + profile store, rank from total Rep
lib/photo.ts               # resize to JPEG + thumbnail
lib/db.ts                  # lazy postgres client or null
lib/gemini.ts              # verifyPhoto(criteria, base64) → {pass, confidence, reason}
app/api/missions/verify/route.ts
components/missions/MissionList.tsx, MissionDetail.tsx, MissionPassed.tsx, LoreCard.tsx
components/ProfilePanel.tsx (extended), components/profile/ProfileEditor.tsx
components/map/MapView.tsx  # mission blips/areas, route layer, click → open mission
```
