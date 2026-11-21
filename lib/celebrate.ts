/** Queue of one-at-a-time celebration moments (rank ups, badges). */
export type Celebration = { id: string; kind: "rank" | "badge"; title: string; subtitle: string; color?: string; glyph?: string };

let queue: Celebration[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function celebrate(c: Celebration) {
  if (queue.length >= 4 || queue.some((q) => q.id === c.id)) return; // don't flood
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
