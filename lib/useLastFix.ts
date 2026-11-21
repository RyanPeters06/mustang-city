"use client";

import { useEffect, useState } from "react";
import { getLastFix, onFix, type Fix } from "./location";

/** Latest player fix for UI (distances, buttons). Throttled so walking doesn't re-render every second. */
export function useLastFix(throttleMs = 2000): Fix | null {
  const [fix, setFix] = useState<Fix | null>(() => (typeof window === "undefined" ? null : getLastFix()));
  useEffect(() => {
    let last = 0;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const off = onFix((f) => {
      const now = Date.now();
      clearTimeout(pending);
      if (now - last >= throttleMs) {
        last = now;
        setFix(f);
      } else {
        pending = setTimeout(() => {
          last = Date.now();
          setFix(getLastFix());
        }, throttleMs - (now - last));
      }
    });
    return () => {
      off();
      clearTimeout(pending);
    };
  }, [throttleMs]);
  return fix;
}
