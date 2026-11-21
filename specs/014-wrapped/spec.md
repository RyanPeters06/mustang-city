# Feature Specification: Graduation Wrapped

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Backlog — Spotify-Wrapped-style recap (fog timelapse from replay data, stats, percentile), shareable
card via Web Share. *Done when:* Wrapped renders from current progress and shares an image.

## Stories
1. Profile → **Forest State Wrapped** opens a 5-slide story (auto-advance 6 s; tap right/left; hold to pause; ✕).
2. Slides: intro · fog timelapse (cells drawn in the order they were cleared, from recorded replay traces; older or
   unrecorded cells first) with km² cleared · numbers (rank, Rep, % explored, missions, districts, badges,
   percentile) · turf (top neighbourhood, favourite mission category) · share card.
3. **Share** renders a 1080×1920 PNG (fog map + stats) and opens the iOS share sheet (Web Share with files);
   falls back to downloading the image.

## Requirements
- Only the player's real data. Percentile comes from `GET /api/wrapped` (share of users with fewer explored cells),
  shown only with DB + sign-in and ≥ 5 players; otherwise a sign-in prompt — never an invented number.
- km² = cells × H3 res-11 average hex area (`getHexagonAreaAvg`).
- Timelapse frame ≥ ~650 m so a first walk fills the frame; reduced motion draws the final frame at once.
- Overlay sits inside the app container (absolute), opaque, above the tab bar.

## Verification
- Browser (real map, phone viewport): demo walk → Profile → Wrapped; all slides captured; share card PNG
  extracted and inspected. tsc, lint, build. iOS share sheet itself not testable headless.
