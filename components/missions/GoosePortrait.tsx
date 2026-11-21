/** The Goose — original crime-boss portrait (inline SVG, original art). */
export default function GoosePortrait({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="The Goose, wearing a fedora and aviator shades"
      className={className}
    >
      <defs>
        <radialGradient id="goose-bg" cx="50%" cy="35%" r="75%">
          <stop offset="0" stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#140a2e" />
        </radialGradient>
        <linearGradient id="goose-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4f8b" />
          <stop offset="1" stopColor="#ff8a3d" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#goose-bg)" />
      {/* suit collar + chain */}
      <path d="M8 64c2-10 10-15 24-15s22 5 24 15z" fill="#1c1236" />
      <path d="M26 49l6 9 6-9" fill="#f6efff" />
      <path d="M20 52c4 6 20 6 24 0" fill="none" stroke="#ffc857" strokeWidth="1.8" strokeDasharray="2.2 1.4" />
      {/* long black neck */}
      <path d="M26 50c-1-8 0-16 1-22h10c1 6 2 14 1 22z" fill="#0d0d12" />
      {/* white chinstrap */}
      <path d="M27.4 36c2-4 7-4 9.4 0l-.5 5c-2.6-2-5.8-2-8.4 0z" fill="#f6efff" />
      {/* head */}
      <ellipse cx="32" cy="27" rx="10" ry="9" fill="#0d0d12" />
      {/* beak */}
      <path d="M40 27c5 0 9 1.6 9 3.4S45 34 40 33z" fill="#2a2a33" />
      <path d="M40.5 31.2h8" stroke="#140a2e" strokeWidth="0.8" />
      {/* aviator shades */}
      <path d="M24 24.5h16" stroke="#ffc857" strokeWidth="1.2" />
      <path d="M24.5 24.5h6.5c0 3-1.4 4.6-3.3 4.6s-3.2-1.6-3.2-4.6z" fill="url(#goose-lens)" />
      <path d="M33 24.5h6.5c0 3-1.4 4.6-3.3 4.6S33 27.5 33 24.5z" fill="url(#goose-lens)" />
      <path d="M26 25.6l1.6 1.2M34.5 25.6l1.6 1.2" stroke="#f6efff" strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
      {/* fedora */}
      <path d="M17 19.5c5-2 25-2 30 0-4 1.4-26 1.4-30 0z" fill="#1c1236" />
      <path d="M23 19c0-6 3-9.5 9-9.5s9 3.5 9 9.5c-5 .8-13 .8-18 0z" fill="#1c1236" />
      <path d="M23.2 17.2c5 .9 12.6 .9 17.6 0l.2 1.8c-5 .9-13 .9-18 0z" fill="#ff4f8b" />
      <path d="M29 10.6c1.2 1.6 4.8 1.6 6 0" fill="none" stroke="#2c1f4d" strokeWidth="1" />
    </svg>
  );
}
