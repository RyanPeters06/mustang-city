"use client";

import { useSyncExternalStore } from "react";
import { getA11y, getServerA11y, setA11y, subscribeA11y, type A11y } from "@/lib/a11y";

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-teal" : "bg-white/15"}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

/** Profile → accessibility mode (lib/a11y.ts). */
export default function AccessibilitySettings() {
  const a = useSyncExternalStore(subscribeA11y, getA11y, getServerA11y);
  const rows: { key: keyof A11y; title: string; body: string }[] = [
    { key: "wideCheckins", title: "Wider check-ins", body: "Doubles every check-in radius, so the curb or the accessible entrance counts." },
    { key: "largeText", title: "Larger text", body: "Scales the whole app up for easier reading." },
  ];
  return (
    <section className="rounded-2xl bg-white/[0.04] px-4 py-3">
      <h3 className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Accessibility</h3>
      <ul className="mt-2 space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-[14px] font-semibold text-ink">{r.title}</span>
              <span className="block text-[12px] text-ink/60">{r.body}</span>
            </span>
            <Switch on={a[r.key]} label={r.title} onChange={() => setA11y({ [r.key]: !a[r.key] })} />
          </li>
        ))}
      </ul>
    </section>
  );
}
