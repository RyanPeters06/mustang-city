"use client";

export type Tab = "map" | "missions" | "crew" | "profile";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "map",
    label: "Map",
    icon: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />,
  },
  {
    id: "missions",
    label: "Missions",
    icon: <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  },
  {
    id: "crew",
    label: "Crew",
    icon: <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8" />,
  },
  {
    id: "profile",
    label: "Profile",
    icon: <path d="M20 21a8 8 0 0 0-16 0M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />,
  },
];

export default function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)" }}
      aria-label="Main"
    >
      <div className="glass flex rounded-[22px] p-1.5">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={on ? "page" : undefined}
              aria-label={t.label}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                on ? "bg-pink/15 text-pink" : "text-ink/60 active:text-ink"
              }`}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {t.icon}
              </svg>
              <span className="text-[11px] font-semibold tracking-wide">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
