# Feature Specification: Neighbourhood Unlocks

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `main`

**Input**: Backlog #3 — London neighbourhood polygons (source recorded), unlock at 30% of a neighbourhood's cells, +50 Rep,
toast, list on Profile, large stylised district names at city zoom. Resolves the brief's open question on boundary data.

## Decision: boundary data
City of London Open Data **Planning Districts** (42 official polygons, `maps.london.ca/.../OpenData_Community/MapServer/18`),
simplified to `lib/data/districts.json`. OpenStreetMap had only 1 neighbourhood polygon and 23 points for London.
Sub-areas like Old East Village and Wortley Village fall inside the official districts (East London, South London).

## User Scenarios
- **US1 (P1)** Exploring 30% of a district unlocks it: "NEIGHBOURHOOD UNLOCKED" toast, +50 Rep, gold outline and name.
- **US2 (P1)** City zoom shows every district name (dim until unlocked) and dashed outlines.
- **US3 (P2)** Crossing into a district shows an "ENTERING <NAME>" banner (open-world area title).
- **US4 (P2)** Profile → Neighbourhoods: unlocked count, per-district progress toward 30%, "show all".

## Requirements
- FR-001 District share = revealed res-11 cells in district / district size (res-9 count × 49).
- FR-002 Unlock is permanent, recorded with a timestamp; +50 Rep each (brief → Progression).
- FR-003 Unlocks detected silently on first load, celebrated afterwards; queued with other celebrations.
- FR-004 Demo control reveals ~33% of the district at the map centre (clearly labelled demo).
- FR-005 Attribution shown on Profile.

## Success Criteria
- SC-001 Stats recompute in < 100 ms for thousands of cells (cached cell→district lookup; measured 51 ms cold).
