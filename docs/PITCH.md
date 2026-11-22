# Mustang City — pitch & demo script

> **One line:** Most Western students spend four years in London and leave knowing only campus, Richmond Row and the 2 bus.
> Mustang City turns London into an open world you uncover — so you graduate knowing your city, and leave with memories of it.

## The story (say it like this)

1. **The problem (personal):** "Most of us didn't grow up here. We arrive at 18, live inside a bubble — campus, Richmond Row,
   one bus route — and four years later we leave. *Almost 85% of Western students leave London after they graduate.*\*
   Most will never come back. We spend four years in a city and never actually meet it."
2. **The insight:** "We already explore cities obsessively — in games. Open-world games make you *want* to see what's behind
   the fog. So what if London *was* the open world?"
3. **The product:** "Mustang City covers London in black fog. It only clears where you've physically walked. Western is your
   home base — Mustang City — and everything else is Forest State, waiting."
4. **Why you'd go:** "The Goose — our crime-boss quest-giver — sends you on missions to real places with real history:
   the house where insulin was conceived, the street that played 1980s New York for Apple TV. A photo proves you went;
   Gemini checks it. You earn Rep, unlock neighbourhoods, ride real LTC buses, and pull heists with people you just met."
5. **What you leave with:** "At graduation you get your Wrapped: the fog you cleared in the order you cleared it, the places,
   the photos, the people. Not just a degree — a map of your four years in London."
6. **Close:** "Graduate knowing your city."

\* Quote from Amir Farahi (London Institute) via 106.9 The X — **verify the exact figure before saying it on stage**; if unsure,
say "the vast majority". International students are ~24% of Western (Times Higher Education).

## Wow features — in priority order

Rank = (how much a judge notices it) × (how reliably it works on stage). Build/practice in this order.

| # | Moment | Why it lands | Status |
|---|---|---|---|
| 1 | **Cinematic intro flight** (title card → letterboxed dive from Forest State into Mustang City) | First 15 seconds; instantly reads as "open-world game" | ✅ built |
| 2 | **Fog clearing timelapse** (Replay of a real walk at 16–48×) | The one image that explains the product | ✅ built — **record your real Saturday walk** |
| 3 | **3D Mustang City** (hand-built Middlesex tower, UC, 160 campus buildings, tap → history card) | Craft + "this is our campus" | ✅ built |
| 4 | **Mission → Gemini photo check → MISSION PASSED** | The game loop + sponsor tech in one beat | ⚠️ needs `GEMINI_API_KEY` (check-in missions work now) |
| 5 | **Live LTC buses** on the map + "Route 2 in 4 min" on a mission card | Real-time data; judges love "that's live" | ✅ working (114 live buses) |
| 6 | **Wrapped share card** — "Graduate knowing your city" | Emotional close: the memory you leave with | ✅ built |
| 7 | Neighbourhood unlock + "Entering East London" banner | Shows the city opening up | ✅ built |
| 8 | Crew compare + faculty turf + heist | Social pitch: meeting people | ✅ built — real accounts need Auth0 + DB |
| 9 | Forest FM radio host | Personality; Gemini TTS voice | ✅ built — Gemini voice needs key |
| 10 | Geo-pinned tags ("left by whoever came before you") | Memories left *for* others | ✅ built |

**Highest-leverage things still to do before judging:** (1) add the Gemini key and test a photo mission end to end,
(2) record one real campus walk for Replay, (3) drop in the cover art, (4) rehearse the script below 3×.

## Demo scripts

Use the **laptop phone frame** (judges see exactly the phone UI). Press **D** for the hidden demo panel. Have the iPhone
(home-screen icon) as backup and a recorded video as the last resort.

### 60 seconds (expo table / fly-by)
1. (0–10 s) Title card → **Tap to enter** → intro flight. *"Most Western students leave London never having seen it."*
2. (10–25 s) Demo panel → **Replay sample walk (48×)** — fog clears across campus. *"The fog only clears where you've walked."*
3. (25–40 s) Tap Middlesex College → history card. *"Every building has a story."*
4. (40–60 s) Profile → **Forest State Wrapped** → share card. *"Graduate knowing your city."*

### 3 minutes (main judging)
| Time | Beat | Do | Say |
|---|---|---|---|
| 0:00–0:20 | Hook | Title card on screen | Story points 1–2 |
| 0:20–0:40 | Intro | Tap to enter → flight | "London becomes Forest State. Western is Mustang City — home base." |
| 0:40–1:05 | Fog | Demo panel → Replay your real walk (16×), then zoom out to city view | "Black fog everywhere you haven't been. % explored, neighbourhoods unlock at 30%." |
| 1:05–1:25 | 3D campus | Fly to Mustang City, tilt, tap Middlesex | "Hand-built 3D campus. Tap any building for its real history." |
| 1:25–2:05 | Mission | Missions → Banting House (or Meet The Family) → Goose briefing → Teleport (demo) → photo → **MISSION PASSED** | "The Goose sends you to real places. Gemini checks your photo. You earn Rep." |
| 2:05–2:25 | Live city | Zoom to downtown: live buses; open a mission card: "Route 2 in 4 min" | "That's live London Transit — missions tell you which bus gets you there." |
| 2:25–2:45 | Social | Crew → compare with a friend, show their fog; mention turf + heists | "Faculties fight over neighbourhoods. Heists need three people at once — strangers meet." |
| 2:45–3:00 | Close | Profile → Wrapped → share card | Story points 5–6: "Graduate knowing your city." |

### 5 minutes (if you get it)
Add after 2:45: Forest FM radio segment (15 s) · leave a tag (20 s) · "Entering East London" banner via demo walk (Old East Village is inside it) (20 s) ·
tech slide: Next.js PWA, Mapbox Standard + hand-built glTF, H3 fog, Gemini (vision + TTS + guarded rewrites),
Auth0 @uwo.ca Action, Supabase Postgres, live GTFS-RT, and the health tracking (WHO 150-minute goal) (45 s).

## Before you walk up (checklist)
- [ ] Laptop: app open, intro **not yet seen this session** (so the flight plays), demo panel tested, light preset = Dusk
- [ ] Sound on (MISSION PASSED sting, radio) — but low
- [ ] Phone: home-screen icon, logged in, location on, battery > 50%
- [ ] Real Replay walk recorded; a real mission photo on the laptop for the photo picker
- [ ] Projector check: text readable at the frame's scaled size
- [ ] Backup video on the desktop

## Likely questions (additions to the brief's Q&A)
- **"Why would students keep using it after week one?"** Fog slowly hazes over (come back), weekly turf, new student missions,
  Class Run turns your daily commute into Rep, and Wrapped rewards the whole four years.
- **"What about students who never leave campus?"** Missions start at the campus edge and use buses — the app literally tells
  you which bus to take next.
- **"Does the city benefit?"** Students who know the city are more likely to stay after graduation; local businesses can sponsor missions.
- **"Is location safe?"** No live location sharing. Friends only see *where* you've been (cleared fog), never *when* or where you are.

Sources: [106.9 The X (London Institute quote)](https://www.1069thex.com/?p=24964) ·
[Times Higher Education — Western](https://resouces-cms.prd.timeshighereducation.com/world-university-rankings/western-university)
