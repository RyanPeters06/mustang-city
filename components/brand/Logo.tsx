/**
 * Mustang City brand — original art.
 * Emblem: a striped sunset disc setting behind a pine skyline (London's "Forest City" nickname),
 * framed by a horseshoe. Wordmark: stacked condensed caps with a sunset gradient.
 */

const STRIPES = [58, 64, 69, 73, 76.5]; // y of the dark scan gaps across the lower sun

export function Emblem({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="Mustang City emblem">
      <defs>
        <linearGradient id="mc-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc857" />
          <stop offset="0.45" stopColor="#ff8a3d" />
          <stop offset="0.8" stopColor="#ff4f8b" />
          <stop offset="1" stopColor="#7b2ff7" />
        </linearGradient>
        <linearGradient id="mc-shoe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe3a3" />
          <stop offset="1" stopColor="#ff4f8b" />
        </linearGradient>
        <clipPath id="mc-disc">
          <circle cx="50" cy="52" r="30" />
        </clipPath>
      </defs>
      {/* horseshoe: open at the bottom, nail holes */}
      <path
        d="M24 86 A36 36 0 1 1 76 86"
        fill="none"
        stroke="url(#mc-shoe)"
        strokeWidth="7"
        strokeLinecap="square"
      />
      {[200, 235, 270, 305, 340].map((deg) => {
        const r = 36;
        const a = (deg * Math.PI) / 180;
        return <rect key={deg} x={50 + r * Math.cos(a) - 1.2} y={52 + r * Math.sin(a) - 1.2} width="2.4" height="2.4" fill="#140a2e" />;
      })}
      {/* sun with scan stripes */}
      <g clipPath="url(#mc-disc)">
        <rect x="18" y="20" width="64" height="64" fill="url(#mc-sun)" />
        {STRIPES.map((y, i) => (
          <rect key={y} x="18" y={y} width="64" height={1.2 + i * 0.5} fill="#140a2e" />
        ))}
        {/* pine skyline + ground */}
        <path
          d="M18 84 V74 l5 -2 l3 -9 l3 9 l4 -1 l4 -13 l4 13 l5 0 l5 -18 l5 18 l5 0 l4 -11 l4 11 l4 1 l3 -7 l3 7 l5 2 V84 Z"
          fill="#05030b"
        />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <p className="text-[12px] font-bold tracking-[0.3em] text-teal uppercase">Forest State</p>
      <h1
        className="font-display mt-1 text-[64px] leading-[0.82] uppercase"
        style={{
          background: "linear-gradient(180deg, #ffe3a3 0%, #ffc857 22%, #ff8a3d 48%, #ff4f8b 74%, #b04bff 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 6px 28px rgba(255,79,139,0.55))",
        }}
      >
        Mustang
        <br />
        City
      </h1>
    </div>
  );
}
