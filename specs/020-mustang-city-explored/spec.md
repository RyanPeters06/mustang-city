# Feature Specification: Mustang City always explored, sharp campus border, every building modelled

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Ryan — "make Mustang City already explored, border that area with sharp borders (not a rough outline) and
keep it explored; get as much detailed models as possible for that."

## Boundary
- Western's real campus boundary: OpenStreetMap `landuse=university` polygons from Mapbox Streets v8 z15 tiles,
  unioned across tile edges (polygon-clipping); main component containing campus centre; 73 points, follows the Thames,
  Western Road, the stadium lands. Saved in `lib/data/campusBoundary.json` (source noted). `inCampus()` now uses it.

## Always explored
- `lib/fog.ts`: campus cells (H3 res 11, `polygonToCells`) are revealed for drawing and `isRevealedAt`, but kept out of
  the player's cell set — Rep, % explored, districts, leaderboards and account sync count only walked cells.
- Fog = London minus (smoothed player blobs ∪ exact campus polygon). Soft feather only on player edges outside campus;
  feather segments that run along the campus border are dropped, so the border stays crisp.
- Border: gold 2.6 px line + pink glow, miter joins, every zoom, above the fog.

## Models
- `scripts/models/extract-campus.mjs` extracts all 170 footprints inside the boundary (stitching tile-split buildings),
  names from `campusBuildings.json`. `campus-rest.glb` adds the 139 not already modelled (Middlesex College, University
  College and the 19-building core stay hand-tuned): sandstone with lancet windows by default, glass for ≥ 18 m, rose
  brick for residences, plain boxes for sheds; every building gets a parapet rim, large roofs get mechanical units;
  `min_height` respected. ~38k tris, 2.2 MB (gzip/brotli on Vercel).
- Basemap medical/commercial/industrial land tinted into the indigo palette (the hospital lands were bright beige).

## Verification
- Fresh session, no walking: whole campus open with a crisp border; HUD still 0.02% explored. North, south and core views
  of the modelled campus. tsc, lint, build.
