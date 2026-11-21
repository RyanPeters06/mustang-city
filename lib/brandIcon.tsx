import { ImageResponse } from "next/og";

/**
 * App icon (original art): the Mustang City emblem — striped sunset disc setting behind a pine
 * skyline ("Forest City"), inside a horseshoe — on night purple.
 */
export function brandIcon(size: number) {
  const stripes = [58, 64, 69, 73, 76.5];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(90% 90% at 50% 100%, #3a1470 0%, #140a2e 70%)",
        }}
      >
        <svg width={size * 0.86} height={size * 0.86} viewBox="0 0 100 100">
          <defs>
            <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffc857" />
              <stop offset="0.45" stopColor="#ff8a3d" />
              <stop offset="0.8" stopColor="#ff4f8b" />
              <stop offset="1" stopColor="#7b2ff7" />
            </linearGradient>
            <linearGradient id="shoe" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffe3a3" />
              <stop offset="1" stopColor="#ff4f8b" />
            </linearGradient>
          </defs>
          <path d="M24 86 A36 36 0 1 1 76 86" fill="none" stroke="url(#shoe)" strokeWidth="7" />
          <circle cx="50" cy="52" r="30" fill="url(#sun)" />
          {stripes.map((y, i) => (
            <rect key={y} x={50 - Math.sqrt(Math.max(0, 900 - (y - 52) ** 2))} y={y} width={2 * Math.sqrt(Math.max(0, 900 - (y - 52) ** 2))} height={1.2 + i * 0.5} fill="#140a2e" />
          ))}
          <path d="M22 76 l4 -1 l3 -9 l3 9 l4 -1 l4 -13 l4 13 l5 0 l5 -18 l5 18 l5 0 l4 -11 l4 11 l4 1 l3 -7 l3 7 l4 1 A30 30 0 0 1 22 76 Z" fill="#05030b" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
