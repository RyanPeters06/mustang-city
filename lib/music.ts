/**
 * Procedural synthwave bed (IDEAS §4, "pause-screen music"): Web Audio only, no licensed tracks or files.
 * A slow minor progression on a filtered saw pad, a soft triangle arpeggio and a sub bass at 88 BPM.
 * Starts from a user gesture (the title-screen press), loops forever, and can be muted (remembered per device).
 */
const KEY = "mc.music.off";
const BPM = 88;
const BEAT = 60 / BPM;
// Am – F – C – G, two bars each (MIDI notes)
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let nextBar = 0;
let bar = 0;
const listeners = new Set<() => void>();

export function musicEnabled() {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}
export const isPlaying = () => !!timer;
export const getServerPlaying = () => false;
export function subscribeMusic(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const emit = () => listeners.forEach((l) => l());

function voice(type: OscillatorType, f: number, t: number, dur: number, gain: number, filter?: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.4, dur * 0.3));
  g.gain.setValueAtTime(gain, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  let out: AudioNode = g;
  if (filter) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = filter;
    g.connect(lp);
    out = lp;
  }
  o.connect(g);
  out.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function scheduleBar(t: number) {
  const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
  const len = BEAT * 4;
  // pad
  for (const n of chord) voice("sawtooth", hz(n), t, len, 0.05, 900);
  // sub bass on beats 1 and 3
  voice("sine", hz(chord[0] - 24), t, BEAT * 1.8, 0.16);
  voice("sine", hz(chord[0] - 24), t + BEAT * 2, BEAT * 1.8, 0.12);
  // arpeggio in eighths, up an octave
  for (let i = 0; i < 8; i++) voice("triangle", hz(chord[i % 3] + 12 + (i >= 4 ? 12 : 0)), t + (i * BEAT) / 2, BEAT * 0.45, 0.035);
  bar++;
}

export function startMusic() {
  if (timer || !musicEnabled() || typeof window === "undefined") return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    void ctx.resume();
    master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 3); // fade in
    master.connect(ctx.destination);
    nextBar = ctx.currentTime + 0.1;
    // look-ahead scheduler: keep ~1 bar queued
    timer = setInterval(() => {
      if (!ctx) return;
      while (nextBar < ctx.currentTime + BEAT * 4) {
        scheduleBar(nextBar);
        nextBar += BEAT * 4;
      }
    }, 250);
    emit();
  } catch {
    /* no audio: silent */
  }
}

export function stopMusic() {
  if (!timer || !ctx || !master) return;
  clearInterval(timer);
  timer = undefined;
  const m = master;
  m.gain.cancelScheduledValues(ctx.currentTime);
  m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
  m.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  setTimeout(() => m.disconnect(), 1400);
  master = null;
  emit();
}

export function toggleMusic() {
  try {
    if (isPlaying()) {
      localStorage.setItem(KEY, "1");
      stopMusic();
    } else {
      localStorage.removeItem(KEY);
      startMusic();
    }
  } catch {
    if (isPlaying()) stopMusic();
    else startMusic();
  }
}

/** Duck the bed under speech (radio, Goose calls). */
export function duckMusic(on: boolean) {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(on ? 0.12 : 0.55, ctx.currentTime + 0.6);
}
