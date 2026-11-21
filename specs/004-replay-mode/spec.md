# Feature Specification: Replay Mode (core #6)

**Created**: 2026-11-21 · **Status**: Draft · **Branch**: `main`

**Input**: Backlog #1 — record a real walk's GPS trace, save it, and play it back so the fog clears on screen at any
speed. Live GPS fails indoors, so replay is the judging backup and later powers Graduation Wrapped (brief → Core 6).

## User Scenarios & Testing

### US1 - Walks are recorded automatically (P1)
While location is on, the app records the player's accepted GPS fixes as a trace. A new trace starts after a 10-minute
gap. **Test**: feed mocked GPS fixes for 2 minutes → a trace appears under Profile → Replays with date, duration, distance.

### US2 - Play a walk back (P1)
From Profile → Replays (or the demo panel), the player plays any trace at 1×, 4× or 16×. The sheet closes, the arrow
follows the path, fog clears along it, and a replay bar shows speed, progress and Stop. **Test**: a 2-minute trace at 16×
finishes in ~8 s with fog clearing and the camera following.

### US3 - Sample walk for demos (P2)
A bundled "Campus loop (sample)" trace is always available, so the demo works on a fresh laptop. **Test**: demo panel →
"Replay sample 16×" clears fog across campus.

## Requirements
- **FR-001** Record only real GPS fixes (not demo or replay fixes); keep a point when moved ≥ 5 m or ≥ 15 s passed.
- **FR-002** Split traces on a > 10-minute gap; drop traces shorter than 3 points; keep the latest 20 on the device.
- **FR-003** Playback feeds points through the same pipeline as live GPS (accuracy rule, reveal radius, marker, follow).
- **FR-004** Speeds 1×/4×/16×; Stop at any time; starting a new replay stops the current one.
- **FR-005** Replay never records itself as a new trace; re-revealing cells is a no-op (fog store is a set).
- **FR-006** A replay bar (inside the app frame) shows "REPLAY", speed, progress and Stop while playing.
- **FR-007** Bundled sample trace (campus loop at walking pace) is always listed.

## Edge cases
- Live GPS fix arrives during a replay → ignored for display until replay stops (no jumping marker).
- Storage full → oldest traces dropped; recording continues in memory.
- Trace timestamps are historical, so the speed check uses each trace's own time (no false "too fast").

## Success Criteria
- **SC-001** 16× playback of a 2-minute walk completes in under 10 s with visible fog clearing.
- **SC-002** Starting a replay takes one tap from Profile.
