import type { EmblemId } from "@/lib/progress";

/** Original line-art emblems (24×24, stroke). */
const PATHS: Record<EmblemId, string> = {
  mustang: "M5 20l2-6-3-3 3-2 1-4 3 2h3l4 3-1 3-3-1-1 3 2 5M10 9h.01",
  goose: "M7 20c0-4 2-6 6-6h3a3 3 0 0 0 0-6c-2 0-3 1-3 3v3M16 5l3-1M4 20h12",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  owl: "M6 4l3 3h6l3-3v9a6 6 0 0 1-12 0zM9.5 11.5h.01M14.5 11.5h.01M11 15l1 1 1-1",
  bus: "M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2zM4 11h16M7 19v-3M17 19v-3",
  crown: "M4 18h16M4 18 3 7l5 4 4-6 4 6 5-4-1 11",
  skull: "M12 3a7 7 0 0 0-7 7v4l2 2v3h10v-3l2-2v-4a7 7 0 0 0-7-7zM9 12h.01M15 12h.01M11 19v-2M13 19v-2",
};

export default function Emblem({ id, accent, size = 56, locked = false }: { id: EmblemId; accent: string; size?: number; locked?: boolean }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: locked ? "rgba(255,255,255,0.06)" : `linear-gradient(145deg, ${accent}, ${accent}99)`,
        boxShadow: locked ? undefined : `0 6px 24px -6px ${accent}`,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.58}
        height={size * 0.58}
        fill="none"
        stroke={locked ? "rgba(246,239,255,0.35)" : "#140A2E"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={PATHS[id]} />
      </svg>
    </span>
  );
}
