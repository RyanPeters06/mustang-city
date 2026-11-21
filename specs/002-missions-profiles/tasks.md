# Tasks: Missions & Profiles

**Tests**: not requested (Constitution VII) — build + lint + browser checks.

## Phase 1: Setup
- [X] T001 Install `@google/genai`; add `GEMINI_API_KEY` notes to .env.example

## Phase 2: Foundational
- [X] T002 [P] Mission type, bundled seed, distance/approx-area helpers in lib/missions.ts
- [X] T003 [P] Progress store (completions, profile, emblems, rank from fog Rep + mission Rep) in lib/progress.ts; HUD uses it in components/Hud.tsx

## Phase 3: US1 Find a mission (P1)
- [X] T004 [US1] Mission blip icons, symbol layer, fogged-area rings, click handler, route layer + `showMission` / `setRoute` handle in components/map/MapView.tsx
- [X] T005 [P] [US1] Missions list cards (type, category, Rep, distance, status) in components/missions/MissionList.tsx
- [X] T006 [US1] Mission detail sheet (briefing, criteria, reward, distance, Set waypoint via Directions) in components/missions/MissionDetail.tsx; wire selection in components/GameScreen.tsx

## Phase 4: US2 Complete a mission (P1)
- [X] T007 [P] [US2] Photo resize + thumbnail in lib/photo.ts
- [X] T008 [P] [US2] Gemini verifier with structured output in lib/gemini.ts; lazy DB client in lib/db.ts
- [X] T009 [US2] Verify route: mission lookup, accuracy + radius check, check-in pass, Gemini photo check, DB save when signed in in app/api/missions/verify/route.ts
- [X] T010 [US2] Completion UI (check-in / photo capture, progress, errors, retry) in components/missions/MissionDetail.tsx
- [X] T011 [P] [US2] MISSION PASSED overlay with sound in components/missions/MissionPassed.tsx
- [X] T012 [P] [US2] Lore card in components/missions/LoreCard.tsx
- [X] T013 [US2] Demo controls: teleport to selected/next mission, trigger MISSION PASSED in components/DemoPanel.tsx

## Phase 5: US3 Profile (P2)
- [X] T014 [US3] Profile card, stats, showcase, completed missions, Archive in components/ProfilePanel.tsx
- [X] T015 [US3] Profile editor (name, faculty, year, emblem with locks, accent, showcase pins) in components/profile/ProfileEditor.tsx

## Phase 6: Polish
- [X] T016 Lint + build; browser-check list → detail → waypoint → demo teleport → check-in → MISSION PASSED → profile; push
