# Feature Specification: Time-of-day Palette

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `main`

**Input**: Backlog — suncalc sunrise/sunset for London drives Mapbox Standard `lightPreset` (dawn/day/dusk/night),
re-evaluated every 10 min (brief → Extended: "golden daytime, sunset at dusk, neon at night").

## Requirements
- FR-001 Windows from the real sun over London: dawn = sunrise −30 → +45 min; dusk = sunset −60 → +30 min; night outside
  those; day between. (Nov 21: sunrise 7:25, sunset 4:56 → dusk ≈ 3:56–5:26 pm.)
- FR-002 Re-checked every 10 min; applied with `setConfigProperty` (no reload, no style swap).
- FR-003 Demo panel can force dawn/day/dusk/night or return to Auto.

## Verification
- Unit check of presets at 06:50 night, 07:40 dawn, 09:00 day, 16:10 dusk, 17:20 dusk, 19:00 night.
- Browser: Auto = night (00:40 local); forcing dusk/day switches live.
