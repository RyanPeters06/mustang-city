# Feature Specification: Hand-built 3D Campus Models

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Ryan — "I trust you to just do it, whatever you can do" (no photos/scans available). Backlog: "Hero 3D model:
Middlesex College — low-poly glTF via Mapbox model layer at z ≥ 16".

## Approach (IDEAS §3 option 3: stylised, script-built)
- `npm run models:build` (`scripts/build-models.mjs`) generates glTF from **real footprints + heights** (Mapbox Streets v8
  building layer, © OpenStreetMap contributors; saved in `scripts/models/footprints.json`) with procedural detail:
  walls, roof cap (earcut), stone cornice, window rows (lancet / ribbon / curtain wall), emissive windows.
- **Middlesex College** (`middlesex-college.glb`, 46 KB): real 56-point footprint (NW block, curved wing, south wing,
  octagon), stone tower with clock faces, belfry openings, corner pinnacles, verdigris copper drum + spire. Tower position
  read from Mapbox satellite imagery; tower height/spire are stylised estimates (not surveyed).
- **University College** (`university-college.glb`, 69 KB): real footprint + the 24.8 m Middlesex Memorial Tower footprint,
  crenellations and corner turrets, lancet windows.
- **Campus core** (`campus-core.glb`, ~780 KB, 19 buildings): sandstone collegiate-gothic halls, concrete modernist
  (Weldon Library, Social Science Centre: ribbon windows, heavy fascia), glass curtain walls (UCC, North Campus, Health
  Sciences, WIRB, Student Services, Spencer Engineering).

## Integration
- Mapbox `model` layer (z ≥ 15, fades in), models registered with absolute URLs; plain extrusions overlapping a model are
  skipped (vertex-overlap test, robust to tile splits); a `clip` layer scoped to the basemap hides Standard's own
  buildings/trees under the footprints. Windows: emissive; strength follows the light preset.
- Tapping a modelled building opens its building card (footprint hit-test, nearest-footprint fallback ≤ 45 m at pitch).

## Gotchas found while building (recorded for future models)
- Mapbox's glTF loader needs **non-interleaved** vertex buffers (`VertexLayout.SEPARATE`), uint16 indices, absolute URLs.
- Axes: +X east, +Y up, +Z south (verified with a test model).
- A clip layer without `clip-layer-scope: ["basemap"]` hides our own models whose anchor sits inside a footprint.

## Verification
- Rendered on the real map day/night: Middlesex College, University College, campus core overview, Weldon close-up;
  taps on Middlesex College and Social Science Centre open the right cards. tsc, lint, build.
