/**
 * Shared motion tokens (UI polish → Motion pass). One easing curve and three springs so every sheet,
 * toast and celebration moves the same way. Reduced motion is handled app-wide by
 * <MotionConfig reducedMotion="user"> in GameScreen.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Sheets, panels, banners: quick, no overshoot. */
export const SPRING_UI = { type: "spring", stiffness: 380, damping: 34 } as const;
/** Toasts and cards popping in: a touch of bounce. */
export const SPRING_POP = { type: "spring", stiffness: 300, damping: 22 } as const;
/** Big celebration type (MISSION PASSED, RANK UP): heavy, dramatic settle. */
export const SPRING_HERO = { type: "spring", stiffness: 230, damping: 18 } as const;

export const DUR = { fast: 0.2, base: 0.35, slow: 0.6 } as const;
