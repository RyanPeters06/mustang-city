"use client";

/** Map button: leave a geo-pinned tag where you're standing. */
export default function TagButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Leave a tag here"
      onClick={onClick}
      className="glass absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full text-ink active:scale-95"
      style={{ bottom: "calc(var(--safe-bottom) + 228px)" }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
        <path d="M5 5h14v10h-7l-4 4v-4H5z" />
        <path d="M12 8v4M10 10h4" strokeLinecap="round" />
      </svg>
    </button>
  );
}
