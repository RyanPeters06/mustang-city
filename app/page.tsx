/**
 * Placeholder title screen. The Mapbox fog map replaces this in the Friday-night build
 * (see docs/product-brief.md → Build plan).
 */
export default function Home() {
  return (
    <main className="absolute inset-0 flex flex-col overflow-hidden">
      {/* sunset sky */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #140A2E 0%, #3a1366 32%, #7B2FF7 48%, #FF4F8B 66%, #FF8A3D 80%, #FFC857 92%)",
        }}
      />
      {/* black fog rolling in from the bottom */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[46%]"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 45%, #000 100%)" }}
      />

      <div style={{ height: "var(--safe-top)" }} />

      <header className="px-6 pt-10">
        <p className="text-[13px] font-semibold tracking-[0.3em] text-teal uppercase">Forest State</p>
        <h1 className="font-display mt-2 text-[64px] leading-[0.9] uppercase text-ink drop-shadow-[0_4px_24px_rgba(255,79,139,0.6)]">
          Mustang
          <br />
          City
        </h1>
      </header>

      <div className="mt-auto px-6" style={{ paddingBottom: "calc(var(--safe-bottom) + 32px)" }}>
        <p className="max-w-[30ch] text-[17px] leading-snug text-ink/85">
          The fog only clears where you&apos;ve been. Graduate knowing your city.
        </p>
        <button
          type="button"
          className="mt-6 h-14 w-full rounded-2xl bg-pink text-[17px] font-bold tracking-wide text-night uppercase shadow-[0_10px_40px_-8px_rgba(255,79,139,0.9)] active:scale-[0.98] transition-transform"
        >
          Enter Forest State
        </button>
      </div>
    </main>
  );
}
