---
name: build-next
description: Build the next item from docs/BACKLOG.md end to end (spec → code → verify → commit → push), one item per run. Use when asked to "build next", "keep building", or via `/loop /build-next` for continuous building.
---

# Build next backlog item

You are continuing the Mustang City build. One run = **one backlog item**, fully finished and pushed.

## 1. Orient (keep it short)
- Read `CLAUDE.md`, `.specify/memory/constitution.md`, then `docs/BACKLOG.md`.
- Run `git status` and `git log --oneline -5`. If the tree is dirty from a previous run, finish or revert
  that work first (never discard someone else's uncommitted changes without saying so).

## 2. Pick
- Take the **first** item marked `[ ]` (or a `[>]` left in progress).
- If it needs a key/service listed under "Needs from Ryan" that is not configured (check `.env.local`
  variable *names* only — never print values), build everything that works without it (graceful
  degradation is required by the constitution). If nothing useful can be built, mark it `[~] blocked: <reason>`
  and move to the next item.
- If **no** `[ ]` items remain: say "Backlog complete", and stop the loop (ScheduleWakeup with `stop: true`
  if running under /loop).

## 3. Spec (light Spec Kit)
- Create `specs/NNN-<short-name>/spec.md` (next number) with: user stories + acceptance scenarios,
  requirements, edge cases, success criteria. Add `tasks.md` (checklist). Keep both under ~150 lines.
- Respect the brief (`docs/product-brief.md`): original IP only, sourced facts only, iPhone-first in the
  phone frame, secrets server-side.

## 4. Build
- Follow existing patterns: `components/map/MapView.tsx` owns the single map; stores live in `lib/`
  (`useSyncExternalStore`); sheets via `components/Sheet.tsx`; API routes degrade with clear messages.
- Use the relevant skills (mapbox-*, gemini-api-dev, pg:*, auth0, impeccable/frontend-design for UI).

## 5. Verify (must all pass before committing)
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Browser check with the preview server (`.claude/launch.json` → `next-dev`): exercise the item's "Done when"
  checks; use the demo panel (press D) and mocked geolocation instead of real GPS.
- Smoke-check the core six still work: fog map + reveal, 3D campus zoom, missions (check-in path),
  profile, crew tab, demo walk.
- Fix what you find; re-verify.

## 6. Ship
- Tick the item `[x]` in `docs/BACKLOG.md` (and tasks.md), commit with a descriptive message ending in the
  repo's co-author line, and `git push` to `main` (Vercel deploys it). Never force-push. Never commit `.env*`.

## 7. Report
- 3–5 lines: what shipped, what was verified, anything blocked or needing Ryan (keys, decisions).

## Guardrails
- Never sign up for services, buy anything, enter credentials, or change account/billing settings.
- Never weaken the @uwo.ca gate, privacy rules (no live location sharing by default), or the accuracy rule.
- If a decision is genuinely Ryan's (product direction, paid services), record it under "Needs from Ryan"
  in the backlog and pick the next item instead of guessing.
