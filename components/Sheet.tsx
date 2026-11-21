"use client";

import { AnimatePresence, motion } from "motion/react";

type Props = { open: boolean; title: string; onClose: () => void; children: React.ReactNode };

/** Bottom sheet sized to the app container; drag down (touch or mouse) to dismiss. */
export default function Sheet({ open, title, onClose, children }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="absolute inset-0 z-30 bg-night/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            key="sheet"
            role="dialog"
            aria-label={title}
            className="glass absolute inset-x-0 bottom-0 z-30 flex max-h-[78%] flex-col rounded-t-[28px]"
            style={{ paddingBottom: "calc(var(--safe-bottom) + 84px)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-white/25" />
            </div>
            <h2 className="font-display px-6 pt-2 text-[30px] leading-none text-ink uppercase">{title}</h2>
            <div className="overflow-y-auto px-6 pt-4">{children}</div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
