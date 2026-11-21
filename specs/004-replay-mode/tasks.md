# Tasks: Replay Mode

- [X] T001 Tag fixes with a source (gps | demo | replay) in lib/location.ts; ignore live fixes while replaying
- [X] T002 Trace recorder + storage + playback engine + sample trace in lib/replay.ts
- [X] T003 Replay bar overlay in components/ReplayBar.tsx; wire into components/GameScreen.tsx
- [X] T004 Replays section (list + 1×/4×/16×) in components/ProfilePanel.tsx
- [X] T005 Demo panel: "Replay sample 16×" in components/DemoPanel.tsx
- [X] T006 Verify (tsc, lint, build, browser: mocked GPS → trace → 16× replay; core smoke), push
