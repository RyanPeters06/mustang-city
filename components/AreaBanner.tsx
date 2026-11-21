"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { onFix } from "@/lib/location";
import { districtAt } from "@/lib/districts";
import { EASE_OUT } from "@/lib/motion";

/** Open-world style area title: the district name fades in when the player crosses into it. */
export default function AreaBanner() {
  const [area, setArea] = useState<string | null>(null);
  const last = useRef<string | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let lastCheck = 0;
    const off = onFix((fix) => {
      const now = performance.now();
      if (now - lastCheck < 800) return; // point-in-polygon at most ~once a second
      lastCheck = now;
      const name = districtAt(fix.lngLat);
      if (name === last.current) return;
      const first = last.current === undefined;
      last.current = name;
      if (!name || first) return; // no banner on the very first fix of the session
      setArea(name);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setArea(null), 2800);
    });
    return () => {
      off();
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {area && (
        <motion.div
          key={area}
          className="pointer-events-none absolute inset-x-0 z-20 text-center"
          style={{ top: "calc(var(--safe-top) + 224px)" }}
          initial={{ opacity: 0, y: -8, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.22em" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <p className="text-[12px] font-bold tracking-[0.3em] text-teal/90 uppercase drop-shadow">Entering</p>
          <p className="font-display text-[30px] leading-tight text-ink uppercase drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)]">{area}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
