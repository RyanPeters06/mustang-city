/**
 * "Demo mode" = the hidden demo panel (press D) is open. Lets judging-day UI show shortcuts such as
 * "Go there" teleports on region quests, without exposing them to normal players.
 */
let on = false;
const listeners = new Set<() => void>();

export const isDemoOn = () => on;
export const getServerDemo = () => false;
export function setDemoOn(v: boolean) {
  if (on === v) return;
  on = v;
  listeners.forEach((l) => l());
}
export function subscribeDemo(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
