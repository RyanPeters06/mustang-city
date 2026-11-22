/** Queue of one-at-a-time celebration moments (rank ups, badges). */
export type Celebration = { id: string; kind: "rank" | "badge" | "district" | "ride" | "collectible" | "class" | "daily" | "streak" | "loot" | "stash" | "surprise"; title: string; subtitle: string; color?: string; glyph?: string };

let queue: Celebration[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const BUZZ: Partial<Record<Celebration["kind"], number[]>> = { district: [40, 60, 120], rank: [60, 80, 160], loot: [25], stash: [30, 40, 30], surprise: [40, 50, 40], badge: [30, 40] };

export function celebrate(c: Celebration) {
  if (queue.length >= 4 || queue.some((q) => q.id === c.id)) return; // don't flood
  // Haptics (IDEAS §5): supported on Android; iOS Safari has no vibrate and safely skips.
  try {
    const p = BUZZ[c.kind];
    if (p && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
  } catch {
    /* ignore */
  }
  queue = [...queue, c];
  emit();
}

export function dismissCelebration() {
  queue = queue.slice(1);
  emit();
}

export const getCelebration = (): Celebration | null => queue[0] ?? null;
export const getServerCelebration = (): Celebration | null => null;
export function subscribeCelebrations(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
