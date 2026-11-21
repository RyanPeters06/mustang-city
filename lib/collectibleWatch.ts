"use client";
/** Finds hidden collectibles from the live position stream (GPS + demo walks; never replays). */
import { onFix } from "./location";
import { COLLECTIBLES, COLLECTIBLE_REP, FIND_RADIUS_M } from "./collectibles";
import { distanceM } from "./geo";
import { findCollectible, getSnapshot } from "./progress";
import { celebrate } from "./celebrate";

let started = false;
export function startCollectibleWatch() {
  if (started || typeof window === "undefined") return;
  started = true;
  onFix((fix) => {
    if (fix.source === "replay" || fix.accuracy > 50) return;
    const finds = getSnapshot().finds;
    for (const c of COLLECTIBLES) {
      if (finds[c.id] || distanceM(fix.lngLat, c.lngLat) > FIND_RADIUS_M) continue;
      if (findCollectible(c.id))
        celebrate({
          id: `find-${c.id}`,
          kind: "collectible",
          title: c.name,
          subtitle: `+${COLLECTIBLE_REP} Rep · ${Object.keys(getSnapshot().finds).length}/${COLLECTIBLES.length} found`,
          color: "#ffc857",
          glyph: "M12 2 20 12 12 22 4 12Z",
        });
    }
  });
}
