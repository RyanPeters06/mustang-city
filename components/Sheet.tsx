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
            className="absolute inset-x-0 bottom-0 z-30 flex max-h-[78%] flex-col rounded-t-[30px] border-t border-white/10 overflow-hidden bg-[#140c2b]/[0.96] shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl"
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
              <div className="h-[5px] w-10 rounded-full bg-white/20" />
            </div>
            <h2 className="font-display px-6 pt-2 text-[30px] leading-none tracking-[0.005em] text-ink uppercase">{title}</h2>
            <div key={title} className="animate-[fadein_220ms_ease-out] overflow-y-auto px-6 pt-4">
              {children}
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
