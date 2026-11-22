"use client";

import { useSyncExternalStore } from "react";
import RegionsBoard from "../districts/RegionsBoard";
import { CATEGORY_LABEL, MISSIONS, TYPE_LABEL, formatDistance, missionDistance, type Mission } from "@/lib/missions";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { useLastFix } from "@/lib/useLastFix";
import StudentJobs from "./StudentJobs";
import type { PassedInfo } from "./MissionDetail";

export const TYPE_COLOR: Record<string, string> = {
  photo: "text-pink",
  checkin: "text-orange",
  bus: "text-teal",
  heist: "text-purple",
  landmark: "text-gold",
};

export default function MissionList({
  onOpen,
  onPassed,
  onOpenRegion,
}: {
  onOpen: (slug: string) => void;
  onPassed: (info: PassedInfo) => void;
  onOpenRegion: (name: string) => void;
}) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { completions, missionCount } = snap;
  const fix = useLastFix();
  const from = fix?.lngLat ?? null;

  const rows = MISSIONS.map((m) => ({ m, d: missionDistance(m, from), done: !!completions[m.slug] })).sort(
    (a, b) => Number(a.done) - Number(b.done) || (a.d ?? 0) - (b.d ?? 0),
  );

  return (
    <div className="space-y-5 pb-4">
      {/* Regions first: claiming them is the main loop (lib/regions.ts) */}
      <RegionsBoard snap={snap} from={from} mode="nearest" onOpen={onOpenRegion} />
      <div>
      <h3 className="mb-1 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Goose jobs</h3>
      <p className="mb-3 text-[14px] text-ink/60">
        {missionCount} of {MISSIONS.length} done{from ? " · nearest first" : " · turn on location to sort by distance"}
      </p>
      <ul className="space-y-2.5">
        {rows.map(({ m, d, done }) => (
          <li key={m.slug}>
            <MissionCard m={m} distance={formatDistance(d)} done={done} onOpen={() => onOpen(m.slug)} />
          </li>
        ))}
      </ul>
      </div>
      <StudentJobs onPassed={onPassed} />
    </div>
  );
}

function MissionCard({ m, distance, done, onOpen }: { m: Mission; distance: string | null; done: boolean; onOpen: () => void }) {
  const kind = m.category ? "landmark" : m.type;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3.5 text-left transition-colors active:bg-white/10 ${done ? "opacity-55" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] font-bold tracking-[0.14em] uppercase ${TYPE_COLOR[kind]}`}>
          {m.category ? CATEGORY_LABEL[m.category] : TYPE_LABEL[m.type]}
          {m.category ? ` · ${TYPE_LABEL[m.type]}` : ""}
        </p>
        <p className="mt-0.5 truncate text-[16px] font-bold text-ink">{m.title}</p>
        <p className="mt-0.5 text-[14px] text-ink/60">{done ? "Mission passed" : (distance ?? "Distance unknown")}</p>
      </div>
      <div className="text-right">
        {done ? (
          <span className="text-[14px] font-bold text-teal">✓ Done</span>
        ) : (
          <span className="text-[16px] font-bold text-orange tabular-nums">+{m.rep}</span>
        )}
      </div>
    </button>
  );
}
