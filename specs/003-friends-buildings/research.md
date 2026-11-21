# Research: real 3D models of Western's buildings

**Question:** can Mustang City show real models of campus buildings instead of extruded footprints?

## Options

| Option | What you get | Fit with our stack | Cost / risk |
|---|---|---|---|
| **A. Hero glTF models** for 2–4 iconic buildings (Middlesex College tower, University College, Weldon) via Mapbox's `model` source + `model` layer | Hand-made or photo-derived models placed exactly on their footprints; can glow/neon-style with material overrides and feature-state | ✅ Native in Mapbox GL JS v3 (glTF 2.0). Works with our fog, lighting and slots. | Needs the models: build in Blender from photos (~half a day each for a game-quality low-poly), image-to-3D AI from photos you take, or CC-licensed models (check licence + attribution). Keep each < 2 MB for phones. |
| **B. Google Photorealistic 3D Tiles** (photogrammetry of the whole campus) | Real textured 3D city, every building | ❌ Not supported by Mapbox GL JS. Google lists CesiumJS, Cesium for Unity/Unreal and deck.gl (`Tile3DLayer`, ≥ 8.9.13) as renderers. Would mean a second renderer or replacing Mapbox — fog, sunset style and blips would need rebuilding. | Google Maps Platform key + billing, strict attribution, heavy on phones (60 fps target at risk). |
| **C. Procedural upgrade** (what we have) | Neon extrusions from Mapbox building heights + Standard's 3D buildings | ✅ Already shipping | Free; not "real" models. |

## Recommendation
1. **Now:** keep C (it's fast and on-style).
2. **Next (post-core, in the backlog):** A for 2–3 hero buildings. Middlesex College first: it's the
   brief's named mission building and has a distinctive spire and clock tower. Mapbox `model` layer, low-poly glTF, neon material,
   swapped in at z ≥ 16 in place of its extrusion.
3. **Stretch / "photo mode":** B as a separate full-screen view (deck.gl + Google 3D Tiles) for a
   "see the real campus" moment, kept out of the main map so the core stays at 60 fps.

## Sources
- [Mapbox — Using 3D models (style spec)](https://docs.mapbox.com/style-spec/guides/using-3d-models/)
- [Mapbox — Add 3D models using a GeoJSON source](https://docs.mapbox.com/mapbox-gl-js/example/add-3d-models-using-geojson-source.md)
- [Mapbox — Add a 3D model with three.js](https://docs.mapbox.com/mapbox-gl-js/example/add-3d-model/)
- [Google — Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/3d-tiles?hl=en)
- [Google — Work with a 3D Tiles renderer](https://developers.google.com/maps/documentation/tile/use-renderer)
- [deck.gl — Using with 3D Tiles](https://deck.gl/docs/developer-guide/base-maps/using-with-3d-tiles)
