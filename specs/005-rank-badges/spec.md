# Feature Specification: Rank-up Moments & Badges

**Created**: 2026-11-21 · **Status**: Draft · **Branch**: `main`

**Input**: Backlog #2 — full-screen "RANK UP" when rank changes; badge engine for the brief's starting set with a Badges
grid on Profile; titles selectable under the name. (Brief → Progression: ranks Frosh → Local → Made → Legend of Forest
State; badges Goose Whisperer, Night Owl, Route 6 Regular, Every Route, Cartographer, Heister; landmark section adds
Location Scout and Historian.)

## User Scenarios & Testing

### US1 - Rank up (P1)
When total Rep crosses a rank threshold, a full-screen RANK UP moment shows the new rank once (sound + animation, no
haptics). **Test**: demo control "+500 Rep" twice from 154 Rep → RANK UP · LOCAL appears once; reload → doesn't replay.

### US2 - Earn badges (P1)
Badges are evaluated whenever progress changes; a new badge shows a "BADGE UNLOCKED" toast and appears in the Profile
Badges grid with its earned date. Locked badges show progress ("2/5") or "Unlocks when buses launch". **Test**: complete a
first mission → "First Job" toast; Badges grid shows it earned.

### US3 - Wear a title (P2)
In the profile editor, the player picks one earned badge as their title; it shows under their name. **Test**: pick
"First Job" → identity card shows it.

## Requirements
- **FR-001** Track the last celebrated rank on the device; celebrate only upward changes, never on first load.
- **FR-002** Badge set: First Job (1 mission), Goose Whisperer (5 goose photo missions), Night Owl (Middlesex study-spot
  mission completed 00:00–05:00 London time), Location Scout (5 film & TV landmarks), Historian (5 history landmarks),
  Cartographer (25% of London), Heister (3 heists), Route 6 Regular (same route on 10 days), Every Route (all LTC routes).
- **FR-003** Badges depending on unbuilt systems (heists, buses) show as locked with "Unlocks when … launch".
- **FR-004** Earned badges persist with timestamps; never un-earned.
- **FR-005** Celebrations queue (rank, badges) and play one at a time; tap to dismiss; reduced-motion respected.
- **FR-006** Title = one earned badge name, editable, shown under the profile name.
- **FR-007** Demo control "+500 Rep (demo)" adds clearly-separated demo Rep; "Reset missions" clears it.

## Edge cases
- Many badges at once (e.g. importing progress) → queued toasts, max 3 shown, rest silently earned.
- Fog reset lowers Rep → rank can drop silently; re-crossing celebrates again only if above the last celebrated rank.

## Success Criteria
- **SC-001** RANK UP appears within 300 ms of crossing a threshold and only once per rank.
- **SC-002** Badge state survives reloads.
