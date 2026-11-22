"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_UI } from "@/lib/motion";

const KEY = "mc.installHint.dismissed";

/** iOS Safari has no install prompt: show a one-time "Add to Home Screen" tip in a Safari tab only. */
function shouldShow() {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(KEY) === "1") return false;
  } catch {
    /* private mode: still fine to show once */
  }
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && safari && !standalone && window.innerWidth < 768;
}

export default function InstallHint({ ready, hidden = false }: { ready: boolean; hidden?: boolean }) {
  const [show, setShow] = useState(false);

  // Only after the first-run cards are finished (never stacked with them).
  useEffect(() => {
    if (!ready) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(t);
      t = setTimeout(() => setShow(shouldShow()), 1500);
    };
    let onboarded = false;
    try {
      onboarded = localStorage.getItem("mc.onboarded.v1") === "1";
    } catch {
      onboarded = true;
    }
    if (onboarded) arm();
    window.addEventListener("mc:onboarded", arm);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mc:onboarded", arm);
    };
  }, [ready]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <AnimatePresence>
      {show && !hidden && (
        <motion.div
          className="glass-solid absolute inset-x-4 z-40 flex items-center gap-3 rounded-[20px] p-3.5"
          style={{ bottom: "calc(var(--safe-bottom) + 96px)" }}
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={SPRING_UI}
          role="dialog"
          aria-label="Add Mustang City to your Home Screen"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ink" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
            </svg>
          </span>
          <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
            Play full screen: tap <b>Share</b>, then <b>Add to Home Screen</b>.
          </p>
          <button type="button" onClick={dismiss} className="min-h-[44px] rounded-full bg-white/10 px-4 text-[14px] font-bold text-ink">
            Got it
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
