# Mustang City — Product Brief

Hack Western 13 · Nov 20, 2026 · @Ryan

## Summary

Mustang City is a mobile web app (PWA) that turns London, Ontario into **Forest State**, a GTA 6-inspired open-world map covered in black fog. The fog clears only where a Western student has physically been. Students uncover the city through photo missions checked by Gemini, bus rides, hidden collectibles and co-op heists. They earn Rep and ranks, fight for districts by faculty, and graduate with a map of everything they explored.

- **Tagline:** Graduate knowing your city.
- **Pitch line:** Most Western students spend four years here and only ever see campus, Richmond Row and the 2 bus. We turn London into a map you uncover, so you graduate knowing your city.
- **Why it wins:** matches the theme ("Discover the unknown") almost word for word, lands the same week GTA 6 is everywhere, gives students a real reason to meet each other, and has one image that explains the product at a glance: black fog clearing as you walk.

"Mustang City" is the product name and the in-game name for Western's campus, the map's main city. London as a whole is "Forest State", a nod to its real nickname, the Forest City.

## Hackathon context and constraints

One person is building this in about 36 hours with heavy help from AI agents, so scope and demo reliability matter more than breadth.

| Item | Detail |
|---|---|
| Event | Hack Western 13, Western University |
| Dates | Nov 20–22, 2026 (about 36 hours of hacking) |
| Venue | Ronald D. Schmeichel Building |
| Theme | Discover the unknown |
| Field | About 103 accepted participants |
| Team | Solo (Ryan Peters), building mostly with AI coding agents |
| Demo device | Ryan's phone, with the app added to the home screen as a PWA |
| Hosting | Vercel |

Judging criteria (general prizes):
1. Innovation and creativity: is the idea original, or does it use technology in an unexpected way?
2. Technical complexity: complex algorithms, integrations or hardware.
3. Completeness: does it work as intended, without major bugs?
4. Design: is it user-friendly and visually appealing?

Devpost submission needs: the team member added to the project, a write-up of what it does and the story behind it, and (optional) images, video or GIFs.

Still to check: the exact submission deadline, and whether the Rules tab limits how many sponsor prizes one project can enter.

## Branding and IP rules

Take the vibe from GTA 6, but keep every name and asset original. The Devpost page, demo video and any LinkedIn or X post are public, and an original parody name also looks more creative to judges. In the pitch, call it "GTA 6-inspired."

- **Use:** a sunset palette (hot pink, orange, gold, purple, teal neon on a deep night background), neon UI, mission cards, a radar-style HUD, rank-up toasts and big "MISSION PASSED" moments.
- **Never use:** Rockstar or GTA names (Leonida, Vice City), GTA logos or wordmarks, game screenshots, art, characters or music.

| Real place | In-game name |
|---|---|
| London, Ontario | Forest State |
| Western campus (the "Vice City" of the map) | Mustang City (also the product name) |
| Neighbourhoods | Real names, such as Old East Village, Wortley Village, Downtown, Masonville, Byron |
| Quest-giver | An original goose crime boss (working name: The Goose) |

Starting palette (adjust freely):

| Token | Hex | Use |
|---|---|---|
| night | #140A2E | Background, panels |
| fog | #000000 | Unexplored areas |
| pink | #FF4F8B | Primary accent, buttons |
| orange | #FF8A3D | Rep, rewards |
| gold | #FFC857 | Ranks, badges |
| purple | #7B2FF7 | Map water, secondary UI |
| teal | #2EE6D6 | Your location, friends, buses |

## Users and problem

Western students live in a bubble, and Mustang City gives them a reason, a route and company to leave it.

**Primary users:** Western undergrads, especially first-years and students from out of town who don't know London.

**The problem:**
- Students stay inside a small loop (campus, Richmond Row, one or two bus routes) for four years.
- First-year students often feel isolated and have no low-pressure way to meet people outside class.
- The bus is the main way students get around, but few know where the routes go.

**The promise:** black fog covers every part of London you haven't been to. By graduation you can look at your map and see how much of the city you uncovered.

**Secondary users:** friend groups (crews), faculties competing for districts, and, after the hackathon, local businesses that sponsor missions.

**What success looks like:** % of London explored per student, neighbourhoods unlocked, missions completed, heists done with people the student didn't already know.

## Core MVP features (must ship)

Six things make the demo: the black-fog map, the 3D zoom into Western, photo missions, login and profiles, friends, and a replay mode. Cut everything else before any of these.

### 1. Black-fog map of London
- Mapbox GL JS on Mapbox Standard, customized into the sunset look (see Map look and performance).
- Fog is an H3 hex grid (h3-js) over the London city boundary. Start at resolution 10 (cells roughly 65 m across) for walking-level detail; fall back to resolution 9 if performance suffers.
- Every unexplored cell is filled solid black. Explored cells are transparent, with a soft feathered edge so the map doesn't look like a grid.
- Reveal logic: `navigator.geolocation.watchPosition` while the app is open. On each fix, reveal the current cell plus its ring-1 neighbours. Ignore fixes with accuracy worse than about 50 m, and fixes that imply impossible speeds.
- Store revealed cell IDs per user. Compute % of London explored and neighbourhoods unlocked (a neighbourhood unlocks when a set share of its cells is cleared, e.g. 30%).
- Web apps get no background GPS: fog clears only while the app is open. The pitch answer is that a native version would track in the background.

### 2. 2D to 3D zoom into Western (Mustang City)
- Over the city, the map is flat (pitch 0). When the user zooms past about z15 inside the campus bounding box, ease the camera to about 60° pitch and fade in a fill-extrusion layer of building heights from Mapbox's built-in building data.
- Campus buildings get a neon edge and gradient; mission buildings (e.g. Middlesex College) glow.
- Zooming back out eases pitch back to 0. This is the main wow moment of the demo, so build it first.

### 3. Missions with photo proof
- Missions appear as pins on the map and as cards in a list. Types: photo, location check-in, bus ride, heist (co-op).
- Photo flow:
  1. Open the camera with `<input type="file" accept="image/*" capture="environment">` (reliable in an iOS home-screen app).
  2. Resize in the browser to about 1080 px and JPEG-compress, because Vercel functions cap request bodies at about 4.5 MB.
  3. Upload to storage (Vercel Blob or Vultr Object Storage), then call the verify API with the image URL and the user's GPS position.
  4. The server checks the position is within the mission radius (about 75 m by default) and recent.
  5. Gemini Vision gets the mission's criteria and returns JSON: `{pass, confidence, reason}`.
  6. On pass: award Rep, play the "MISSION PASSED" animation, post the photo to the user's profile and the feed.
- Seed 10–15 real missions, for example: find the secret study spot in Middlesex College, photograph a goose, reach the top of UC Hill, visit The Spoke, ride a bus to Old East Village.

### 4. Login and profiles
- Auth0 (Next.js SDK). Restrict sign-up to @uwo.ca emails with an Auth0 Action.
- Profile: display name, faculty, rank, Rep, % explored, neighbourhoods unlocked, completed missions with photos, badges. Visible to other students.

### 5. Friends
- Add friends by username or QR code. Compare % explored, missions done and rank side by side; show a friend's fog map.

### 6. Replay mode
- Record a real walk's GPS trace (Saturday), save it, and play it back so the fog clears on screen at any speed.
- Live GPS demos fail indoors, so this is the judging backup. It also powers Graduation Wrapped.

## Map look and performance (the main wow factor)

The map is what judges will remember, so it gets the most polish: a full 3D city with a game-style map menu, clean and finished, running at a steady 60 fps on the iPhone and in the laptop phone frame. The feel comes from open-world game map menus, but the layout, icons, fonts and names are original (see Branding and IP rules).

### Base map
- Build on Mapbox Standard (GL JS v3 or later). It already has lit 3D buildings, 3D trees, landmarks and dynamic lighting; configure it through `config.basemap` at creation and `map.setConfigProperty('basemap', …)` at runtime.
- `lightPreset` follows London's real clock: day, dusk around sunset, night after dark. This is the time-of-day palette feature, almost for free.
- Push the whole map into the sunset palette with `theme: "custom"` and a colour look-up-table image, plus overrides such as `colorMotorways` and `colorBuildings`.
- Hide clutter: turn off POI labels, transit labels and pedestrian roads. Show only district names and Mustang City's own blips.
- Atmosphere: `map.setFog()` with a pink-orange horizon glow so tilted views fade into a sunset sky.
- Always 3D: about 45° pitch across the city, easing to about 60° and closer detail on campus. Standard's built-in 3D buildings replace a hand-made extrusion layer; campus and mission buildings get a highlight colour.
- Neon road glow, if the theme alone doesn't get there: duplicate road line layers with `line-blur` in pink and orange. Custom layers on Standard need `emissive-strength` set to look right under its lighting.

### Map menu (game pause-menu feel)
- A full-screen map mode opens from the tab bar. Opening it dims, blurs and scales in over about 250 ms, with a soft UI sound.
- Top tabs styled like a game menu: Map, Missions, Stats, Crew, Archive.
- A legend panel lists blip types (missions, landmarks, collectibles, buses, friends, tags), each with a toggle.
- One consistent, original blip icon set. The player arrow rotates with heading and has a pulsing ring.
- Waypoints: tap a mission, choose Set waypoint, and a glowing walking route appears (Mapbox Directions API, walking profile) with distance and time, plus the nearest bus option.
- Large stylised district names at city zoom, with each district tinted by the faculty that holds it.
- Opening a mission flies the camera to it in one smooth, cinematic move.

### Looks finished
- A branded loading screen stays up until the style and first tiles are ready (the map's `load` and `idle` events). Never show a half-drawn map.
- Every camera change is eased (`flyTo` / `easeTo`); nothing jumps.
- No default Mapbox controls. Custom zoom and compass buttons match the HUD. Keep the required Mapbox attribution, styled small and neat.
- Spacing, type sizes and icon sizes are consistent across the HUD, legend, sheets and tabs.

### No lag: performance rules
- Create one map instance once and keep it in a React ref; React never re-mounts it. Update map data with `source.setData()`, and keep GPS updates out of React state.
- Fog is a single GeoJSON polygon: the London boundary with explored areas cut out as holes (h3-js `cellsToMultiPolygon`). Rebuild it only when new cells are revealed, debounced, and never draw thousands of separate hexes. A blurred line layer on the hole edges gives the soft border.
- Blips are symbol layers, not HTML markers (DOM markers stutter on phones). Cluster them when zoomed out.
- Live buses refresh every 10–15 seconds and animate smoothly between positions.
- Cap the pixel ratio at 2 on high-density screens. If frame rate drops, turn off `show3dTrees` or `show3dFacades` before anything else.
- Lazy-load heavy screens (Wrapped, radio) so the map always loads first.
- Targets: map usable in under about 3 seconds on campus Wi-Fi, and 60 fps panning, zooming and tilting on the iPhone. Profile with Safari Web Inspector, and use Mapbox's GL JS performance skill.

### Map acceptance criteria
- [ ] City view is 3D and tilted, with sunset lighting, black fog, district names and no clutter
- [ ] Zooming into campus tilts smoothly into detailed 3D with highlighted buildings
- [ ] The map menu opens and closes in under 300 ms; legend toggles and waypoints work
- [ ] No visible stutter while panning on the iPhone or in the laptop phone frame

## Landmark missions: history and pop culture

Some missions send students to places with a story: London history, film and TV shoots, and viral video spots. Arriving unlocks a short brief about why the place matters. Seed 5–8 of them alongside the other missions on Saturday morning.

How a landmark mission works:
1. The mission card shows the category (History, Film and TV, Viral), a teaser, and the area on the map. The exact spot is revealed once the fog there is cleared.
2. On arrival (GPS within radius), a lore card opens with a 2–3 sentence brief, the year, and a source link.
3. The photo task ties to the story, e.g. a photo with the Banting statue, or the same street angle as the shoot.
4. Completed lore cards are collected in a Mustang City Archive on the profile. Badges: Location Scout (5 film and TV missions), Historian (5 history missions).
5. The AI radio host and the goose boss can mention nearby landmarks in their lines.

**Accuracy rule:** every brief is written from a stored, sourced fact. Gemini may rewrite the stored fact in the app's voice but must not add facts of its own. No movie stills, posters or clips: names and facts in text only.

Starting seed list (verified):

| Place | Category | Brief (fact to store) | Source |
|---|---|---|---|
| Banting House, 442 Adelaide St N | History | Here, early on October 31, 1920, Frederick Banting had the idea that led to insulin; it is now a National Historic Site with a statue of him outside | Parks Canada |
| Eldon House, 481 Ridout St N (Harris Park) | History | Built in 1834 by Captain John Harris; London's oldest remaining house, given to the city in 1959 | Wikipedia |
| Richmond Street, downtown | Film and TV | In August 2022 the Apple TV+ series The Changeling turned a block of Richmond Street into 1980s New York City | CBC News |
| Fanshawe Conservation Area | Film and TV | Arnold Schwarzenegger filmed Netflix's FUBAR season 2 here | Tourism London |
| Labatt Memorial Park | Film and TV | The little league baseball movie You Gotta Believe filmed here | Global News |
| Western campus and the Thames | Film and TV | The Amazing Race Canada season 8, episode 6 ran a full leg in London, including downtown, the Thames River and Western's campus | Film London |

Viral video spots: none seeded yet. Add each only after confirming the exact location from a reliable source (news coverage or the creator's own post), and store that link with it.

Data: landmark missions use the same missions table, with extra fields `category`, `brief`, `year` and `source_url`.

## Extended features

Every feature from the brainstorm stays in scope, but each one comes after the core and in the build order set out in the build plan. Effort assumes a solo builder with AI agents.

| Feature | What it does | Implementation notes | Effort |
|---|---|---|---|
| Time-of-day map style | Map palette follows London's real clock: golden daytime, sunset at dusk, neon at night | Swap Mapbox style or paint properties by local time; compute sunset times with suncalc | Easy |
| Live weather | Rain or snow overlay when it is actually raining in London | Poll a free weather API; CSS or canvas particle overlay | Easy |
| Fog that comes back | Areas not visited for about 6 months fade back to grey | Store last_visited_at per cell; render opacity by age | Easy |
| Hidden collectibles | Invisible until you are within about 50 m; each has a short Gemini-written piece of local history | Seeded points table; distance check on GPS update; cache Gemini text | Easy |
| Radar HUD | Corner minimap with blips for nearby missions, friends, collectibles and buses | Small canvas or SVG overlay fed from the same position stream | Medium |
| Goose boss quest-giver | Original goose crime-boss character who hands out missions in character | Static character art (original), Gemini writes in-character mission briefings | Easy |
| AI radio host | DJ voice comments on where you are while you walk or ride ("You're entering Old East Village…") | Gemini script from current neighbourhood + nearby points of interest, then text-to-speech; play in-app | Medium |
| Poster-style mission cards | Completed photo gets a sunset-poster filter and a "MISSION PASSED" stamp, ready to share | Canvas compositing in the browser; Web Share API | Easy |
| Geo-pinned tags | Leave a photo or note at a spot; others discover it when they clear fog there | Tags table with H3 cell; reveal when the viewer's cell is cleared | Medium |
| Student-written missions | Anyone can create a mission; the best ones are voted up | Mission create form + votes table; Gemini screens for unsafe or private-property missions | Medium |
| Crews | Friend groups with a shared fog map | Crew table; union of members' revealed cells | Easy |
| Live buses | LTC buses move on the map; mission cards show arrival times ("Route 2 arrives in 4 min") | LTC GTFS static zip + GTFS-RT feeds, parsed in a Next.js API route with gtfs-realtime-bindings | Medium |
| Route collection | Route lines light up as you ride them; achievement for riding every LTC route | Detect a ride by matching GPS trace to route shape at bus speed, or check-in at start and end stops | Easy once buses work |
| Graduation Wrapped | Spotify Wrapped-style recap: animated fog timelapse, stats ("you explored 34% of London, more than 91% of students"), shareable card | Reuses replay mode; percentile query over all users | Medium |
| Event missions (TinyFish) | An AI agent checks London event sites daily and turns new events into missions | TinyFish agent job on a schedule, writes to missions table | Medium, stretch |
| Live friend locations | Friends as blips on the map | Off by default; opt-in; blurred to neighbourhood level | Medium, optional |

Heists, turf wars, badges and leaderboards are covered in the progression section.

## Progression and rewards

Rep is the single currency: every action earns it, ranks come from it, and faculty turf is decided by it. The values below are starting points to tune during testing.

| Action | Rep |
|---|---|
| Clear a new fog cell | 1 |
| Unlock a neighbourhood | 50 |
| Find a hidden collectible | 25 |
| Complete a photo or check-in mission | 100 |
| Complete a bus-ride mission | 150 |
| Complete a heist | 300 each |
| Your tag or mission gets upvoted | 10 |

**Ranks:** Frosh (0) → Local (1,000) → Made (5,000) → Legend of Forest State (15,000). Rank-up shows a full-screen toast.

**Faculty turf wars:** the map is split into districts (London's neighbourhoods; campus split into zones). The faculty (Engineering, Ivey, Science, Social Science, and so on) whose students earned the most Rep in a district holds it, and the district shows that faculty's colour. This drives school spirit and repeat visits.

**Heists:** co-op missions that need 3 or more students at one spot within a short time window, e.g. a group photo at the top of UC Hill. Each member's GPS check-in must land within the radius and window; one group photo is verified by Gemini. This is how strangers meet, and it carries the social pitch.

**Badges (starting set):**
- Goose Whisperer: photograph geese for 5 missions
- Night Owl: complete the Middlesex College study-spot mission after midnight
- Route 6 Regular: ride the same route on 10 different days
- Every Route: ride all LTC routes
- Cartographer: explore 25% of London
- Heister: complete 3 heists

**Leaderboards:** weekly and all-time, filtered to friends, your faculty, or all of Western. Ranked by Rep and by % explored.

**Real-world rewards (pitch, not built):** missions sponsored by local businesses, e.g. find The Spoke and get $2 off a coffee. This is also the business model.

## Prize tracks

**Updated Nov 22:** enter Overall, Most Adventurous, Sun Life (Health card + walking framing), Gemini, Auth0, Entire and GoDaddy. Tiger Data is dropped (Supabase is the database now). If the rules cap sponsor entries, prioritise Most Adventurous, Sun Life and Gemini.

| Track | Prize | Fit | How Mustang City qualifies |
|---|---|---|---|
| First / Second / Third Overall | iPad / AirPods Pro 3 / Fitbit Air per member | Strong | Polished, complete app scoring on all four criteria |
| Organizers' Choice: Most Adventurous | Arc'teryx toque per member | Strong | Its brief, "a hack that enables others to discover the unknown," is the pitch |
| [MLH] Best Use of Gemini API | MLH swag kits | Strong | Photo verification, mission and collectible text, radio host scripts, goose boss dialogue |
| ~~[MLH] Best Use of Tiger Data~~ | Stream Deck Mini | Dropped | Replaced by Supabase on Nov 22 |
| [MLH] Best Use of Auth0 | Wireless headphones | Strong | Login restricted to @uwo.ca via an Auth0 Action |
| [MLH] Best Domain Name from GoDaddy Registry | Digital gift card | Strong | Register a domain through MLH's GoDaddy Registry offer and point it at Vercel |
| [MLH] Best Use of Entire | Mini portable projector | Strong if used | Build with AI agents through Entire (Sessions, Graph, Brain); report token savings in the write-up |
| [MLH] Best Use of Vultr | Assorted prizes | Only with a Vultr piece | Frontend is on Vercel, so put photo storage in Vultr Object Storage or the bus poller on a small Vultr instance |
| Best Health Hack by Sun Life | $100 Amazon gift card per member | Medium | Frame around walking and first-year loneliness; show who it helps and the impact, with a statistic on student isolation |
| Hire Your First AI Employee by TinyFish | $75 gift card + $100 credits per member | Weak to medium | Event-scout agent that turns London events into missions; must post the demo on X or LinkedIn and tag TinyFish |

### Track action plan

| Track | Concrete action | Effort |
|---|---|---|
| GoDaddy Registry domain | Claim the free domain through the MLH offer, point it at Vercel, use it everywhere (Devpost, demo, QR code on the title slide) | 15 min |
| Vultr | Store mission photos in Vultr Object Storage (S3-compatible) instead of Vercel Blob; mention it in the write-up | 30–60 min |
| Gemini | Also use Gemini's text-to-speech for the radio host voice, so every AI feature runs on Gemini | Small |
| Tiger Data | Show the GPS pings hypertable and a continuous aggregate in the write-up, with a screenshot of the query powering % explored | Small |
| Auth0 | Show the @uwo.ca-only Action in the write-up | Small |
| Entire | Keep Entire on from the first commit; include session and token-savings screenshots in the write-up | Small |
| Sun Life health | Add "km walked" and "new places this week" to the profile; pitch walking and first-year loneliness with one statistic | 1 hr |
| TinyFish | Stretch: daily agent that turns London event listings into missions; post the demo on X or LinkedIn tagging TinyFish | 2–3 hr |

Domain shortlist (check availability and which extensions the free MLH offer covers; GoDaddy Registry runs extensions such as .co, .club, .wiki, .tv, .vip and .us):

| Domain | Why it works |
|---|---|
| mustangcity.club | The project's name; "club" fits crews and faculty turf. **Chosen** |
| mustangcity.co | Backup if .club isn't covered by the free offer or is taken |
| wildwestern.club | Backup: Western + the Wild West frontier |
| purplereign.club | Backup: Western purple + faculty turf "reign" |
| freeroam.horse | Backup: open-world "free roam" + mustangs; check the offer covers .horse |

Avoid .us (requires a US connection). Avoid anything with "GTA" or "Grand Theft" in it (trademark).

Skip: Best Use of QNX, Best Hardware Prototype by PCBWay, [MLH] Best Use of Solana, Canada Life Future Me.

## iPhone experience

Mustang City is a React app (Next.js), but almost every user will open it from an iPhone home screen after adding it in Safari. The mobile UI is the product, and the laptop demo shows the exact same phone screen.

### How it is installed and demoed
- Open the Vercel URL in Safari on the iPhone → Share → Add to Home Screen → open from the icon.
- Safari has no automatic install prompt, so show a one-time "Add to Home Screen" hint when the app is opened in a Safari tab (detect with the `display-mode: standalone` media query or `navigator.standalone`).
- All testing and the demo happen from the home-screen icon, never a Safari tab.

### iOS setup checklist
- Next.js metadata: `appleWebApp: { capable: true, title: "Mustang City", statusBarStyle: "black-translucent" }` so the map runs edge to edge under the status bar, plus a matching `themeColor`.
- A 180×180 apple-touch-icon PNG; don't rely on manifest icons alone.
- Heights in `100dvh` / `100svh`, never `100vh`.
- `viewport-fit=cover`, with `env(safe-area-inset-*)` padding on the top HUD and bottom tab bar.
- Remove the "web page" feel: `-webkit-tap-highlight-color: transparent`; `-webkit-touch-callout: none` and `user-select: none` on UI chrome (not on inputs); `overscroll-behavior: none`; `touch-action: manipulation` to stop double-tap zoom.
- Inputs at 16 px font size or larger, or iOS zooms in when they are focused.
- No vibration on iOS Safari: MISSION PASSED uses animation and sound, not haptics.
- The radio host's audio must start from a tap; iOS blocks autoplay with sound.
- Ask for location and camera access at a meaningful moment, after a short explainer screen.
- The home-screen app keeps its own storage, login and permissions, separate from Safari. Log in from inside the home-screen app, and test the Auth0 redirect round trip there on Friday night.
- Design for portrait only.

### What "looks really good" means here
- The map is always full screen; all UI floats over it, like Apple Maps.
- Missions and details open in a draggable bottom sheet with three snap points (peek, half, full), reachable with one thumb.
- Bottom tab bar: Map, Missions, Crew, Profile. Every tap target is at least 44 pt.
- Top HUD: Rep, rank, % explored and the mini radar, inside the safe area.
- Spring animations (the Motion library) for sheets, rank-ups and MISSION PASSED, at a smooth 60 fps; respect reduced-motion settings.
- One bold display font for titles and mission names, one clean UI font; avoid the default Inter/Roboto look.
- Dark night UI throughout, with sunset gradients as accents, and enough contrast to read outdoors in sunlight.
- Skeleton states and optimistic updates so nothing feels like a web page loading; photo uploads show progress.
- Check every screen at small (375 pt wide) and large (440 pt wide) iPhone sizes.

## Laptop demo: phone frame

The main demo will likely run on Ryan's laptop, so on any wide screen the deployed app shows exactly the phone screen: the same layout, at an iPhone aspect ratio, centered in the browser window.

- **One layout, two shells.** On a phone (narrow screen or home-screen app), the app fills the screen. On a laptop (wider than about 768 px), the same app renders inside a centered phone-shaped container: about 430 × 932 px (roughly 9:19.5), scaled down to fit the window height with a small margin, rounded corners, and a dark sunset backdrop around it.
- **Never a separate desktop layout.** Nothing changes inside the frame.
- **Size everything to the app container, not the viewport.** The `100dvh` rule applies only to the outer shell. Inside the app, use `position: absolute` within the root container instead of `position: fixed`, and size sheets, HUD and tab bar to the container, so nothing escapes the frame. Call Mapbox's `resize()` when the container size changes.
- **Safe areas are zero on a laptop.** Add a fake status-bar spacer (about 47 px) at the top of the frame so the HUD sits where it would on an iPhone.
- **Mouse and trackpad must work.** Bottom sheets, buttons and the map use pointer events (not touch-only).
- **Laptop limits:** location from a laptop is rough and there's no rear camera, so the laptop demo relies on replay mode, and photo missions accept a picked file.
- **Hidden demo controls:** a keyboard shortcut (e.g. press D) opens a small panel outside the frame to start a replay, jump to a mission spot, or trigger MISSION PASSED, so the demo never waits on GPS.
- **Projector check:** test the frame on a 1080p projector or external screen before judging.

### Testing in Safari
- Automated: Playwright MCP running WebKit, Safari's engine, with an iPhone profile.
- On a Mac with Xcode: agent-browser can drive real Mobile Safari in the iOS Simulator.
- Final check after every deploy: Ryan's iPhone, from the home-screen icon.

Skills note: this is React for the web, so don't install React Native skills.

## Technical architecture

The app is a Next.js PWA deployed on Vercel and added to the phone's home screen; the phone talks to Mapbox for tiles and to the app's own API routes for everything else. The phone never calls Gemini, the database or LTC directly; API routes hold the keys and handle CORS.

| Layer | Choice | Notes |
|---|---|---|
| App | React with Next.js (App Router), TypeScript, Tailwind, Motion for animation | Mobile-first; one codebase for UI and API |
| Map | Mapbox GL JS + Mapbox Standard (custom config) | 3D buildings on campus |
| Fog | h3-js, resolution 10 (fallback 9) | Revealed cell IDs stored per user |
| Auth | Auth0 Next.js SDK | Auth0 Action rejects non-@uwo.ca emails |
| Database | Supabase (Postgres) | GPS pings table; a view for daily explored cells |
| Photo storage | Vercel Blob, or Vultr Object Storage to qualify for Vultr | Upload directly from the browser; send Gemini the URL |
| AI | Gemini API | Vision for photo checks; text for missions, lore, radio scripts, goose boss; TTS for the radio voice |
| Transit | LTC GTFS static zip + GTFS-RT feeds | Parse protobuf in an API route with gtfs-realtime-bindings |
| Hosting and domain | Vercel + GoDaddy Registry domain | HTTPS from day one: phones only share GPS with HTTPS sites |
| Dev workflow | Entire (Sessions, Graph, Brain) | Needed for the Entire track; record token savings |

PWA requirements:
- Web app manifest with `display: "standalone"`, sunset `theme_color`, 192 px and 512 px icons, plus an apple-touch-icon for iOS.
- `viewport-fit=cover`, and pad the UI with `env(safe-area-inset-*)`.
- Turn off page-level pinch zoom and pull-to-refresh (`overscroll-behavior: none`) so only the map responds to gestures.

## Data model

All tables live in one Tiger Data (Postgres) database; `location_pings` is the only hypertable.

| Table | Key fields | Notes |
|---|---|---|
| users | id, auth0_id, email, display_name, faculty, rep, rank, created_at | Email must end in @uwo.ca |
| location_pings | user_id, ts, lat, lng, accuracy_m, h3_cell | Hypertable on ts; feeds reveal, replay and Wrapped |
| revealed_cells | user_id, h3_cell, first_seen_at, last_visited_at | PK (user_id, h3_cell); last_visited_at drives fog decay |
| neighbourhoods | id, name, polygon, h3_cells[] | London neighbourhoods plus campus zones; used for unlocks and turf |
| missions | id, title, briefing, type (photo, checkin, bus, heist), lat, lng, radius_m, criteria, rep_reward, creator_id, is_official, active | criteria is the plain-language check sent to Gemini; landmark missions also store category, brief, year and source_url |
| mission_completions | id, mission_id, user_id, photo_url, lat, lng, gemini_pass, gemini_reason, completed_at | Shown on profile and feed |
| heist_attempts | id, mission_id, started_at, member_ids[], photo_url, status | Completes when 3+ members check in within radius and time window |
| friendships | user_id, friend_id, status, created_at | pending or accepted |
| crews | id, name, member_ids[] | Shared fog = union of members' revealed cells |
| tags | id, user_id, h3_cell, lat, lng, note, photo_url, votes, created_at | Visible once that cell is revealed for the viewer |
| collectibles | id, name, lat, lng, lore_text | Lore generated once by Gemini, then cached |
| collectible_finds | user_id, collectible_id, found_at | |
| badges | id, code, name, description | Seeded |
| user_badges | user_id, badge_id, earned_at | |
| mission_votes | mission_id, user_id, value | For student-written missions |
| rides | id, user_id, route_id, start_stop, end_stop, started_at, ended_at | For route collection and bus missions |
| district_control | neighbourhood_id, faculty, rep_total, updated_at | Recomputed on a schedule or by a continuous aggregate |

Continuous aggregates: per-user explored-cell counts (for %), weekly Rep by user and by faculty (leaderboards and turf).

## Build plan

Build in this order: core first, then extended features as time allows. Each phase ends with a deploy to Vercel and a test from the home-screen icon on the phone.

### Friday night: foundation
- [ ] Next.js + TypeScript + Tailwind project; PWA manifest, icons, safe-area handling
- [ ] Deploy to Vercel; point the GoDaddy Registry domain at it
- [ ] Mapbox map with the sunset style; 2D to 3D zoom into Western
- [ ] Auth0 login with the @uwo.ca restriction
- [ ] Tiger Data schema (tables above) and seed script
- [ ] Set up Entire for the agent workflow

### Saturday morning: missions
- [ ] Mission pins and cards; seed 10–15 real missions
- [ ] Photo flow: camera, resize, upload, GPS radius check, Gemini verification, MISSION PASSED animation
- [ ] Profile page with completed missions and photos

### Saturday afternoon: fog and progression
- [ ] H3 black fog with live reveal and % explored
- [ ] Neighbourhood unlocks
- [ ] Rep, ranks, rank-up toasts; badges
- [ ] Friends and comparison view; leaderboards
- [ ] Replay mode (record and play back a walk)

### Saturday night: extended features, in priority order
1. Time-of-day map palette
2. Goose boss quest-giver
3. Geo-pinned tags
4. AI radio host
5. Graduation Wrapped
6. Live buses and arrival times, then route collection
7. Faculty turf colours, then heists
8. Poster-style mission cards, hidden collectibles, radar HUD, fog decay, crews, student-written missions, weather
9. Stretch: TinyFish event missions, opt-in friend locations

### Sunday morning: demo and submission
- [ ] Walk around campus doing missions to record real fog and photos
- [ ] Record a backup demo video
- [ ] Write the Devpost story; add screenshots and GIFs; list every track entered
- [ ] Post the demo on LinkedIn or X tagging TinyFish (if entering that track)

**Cut order if behind:** stretch items first, then heists, then live buses. Never cut the fog, the 3D zoom into Western or photo missions.

## Demo plan and judge Q&A

The demo runs on Ryan's laptop in the phone-frame view and lasts about 3 minutes. The iPhone home-screen app and a recorded video are the backups.

1. Hook (20 s): the pitch line, with the black-fog map of London on screen.
2. Fog clearing (30 s): play the replay of Saturday's walk; fog clears and % explored rises.
3. Zoom into Mustang City (20 s): the map tilts from 2D to 3D over Western.
4. Mission (45 s): the goose boss briefs a mission; take or show a photo; Gemini verifies it; MISSION PASSED.
5. Social (30 s): profile, friend comparison, faculty turf colours, a geo-pinned tag, a heist.
6. Radio and buses (20 s): turn on the radio host; show live buses with an arrival time on a mission card.
7. Close (15 s): Graduation Wrapped card: "Graduate knowing your city."

| Likely judge question | Answer |
|---|---|
| Doesn't this already exist (e.g. Fog of World)? | Those apps only track where you've been. Mustang City is built for Western, with AI-verified missions, faculty turf wars, bus missions and heists that get students meeting each other. |
| Who writes all the missions? | Students do: anyone can create one, the best are voted up, and Gemini screens out unsafe ones. Official missions seed it. |
| Can people cheat? | Missions check GPS radius and time, and Gemini checks the photo matches the mission. |
| What about privacy? | Live location sharing is off by default and blurred to neighbourhood level when on. Only revealed cells are shown, never raw traces. |
| What about safety? | No missions on private property; Gemini screens student missions; night missions can be filtered out. |
| Why not track in the background? | A web app can't; a native version would. The PWA proves the concept without app-store delays. |
| How would it make money? | Local businesses sponsor missions (find The Spoke, get $2 off a coffee). |
| Why will students keep using it? | Fog slowly comes back, turf changes weekly, new student missions appear, and Wrapped rewards four years of exploring. |

## Risks and open questions

| Risk | Mitigation |
|---|---|
| Too much scope for one person in 36 hours | Strict build order and cut list; core first |
| GPS doesn't work indoors during judging | Replay mode with a real recorded walk; backup video |
| H3 fog is slow to render on a phone | Only render cells in the current viewport; fall back to resolution 9; merge cleared cells into polygons |
| Photo uploads fail on Vercel's body limit | Resize in the browser to about 1080 px; upload straight to storage |
| Gemini wrongly rejects a valid photo | Lenient prompt, confidence threshold, manual override for the demo account |
| LTC realtime feed is down or slow | Cache the last good response; buses are on the cut list |
| Trademark trouble from GTA references | Original names and art only |
| Hosting on Vercel removes Vultr eligibility | Put photo storage or the bus poller on Vultr, or drop that track |

Open questions:
- [x] Western district name: decided, Mustang City (London is Forest State)
- [ ] Submission deadline time on Sunday
- [ ] Does the Rules tab cap the number of sponsor prizes per project?
- [ ] Vultr: use Vultr Object Storage for photos, or skip the track?
- [ ] Which neighbourhood boundary data to use for London (city open data or hand-drawn polygons)?

## Instructions for the coding agent

Start with the Friday-night phase of the build plan and get a deployed, installable PWA with the 3D campus zoom working before anything else.

Ground rules:
- Mobile-first: design for an iPhone-sized screen in standalone mode; on laptops and desktops the same app renders inside a centered phone frame. Follow the iPhone experience section to the letter.
- Never use Rockstar or GTA names, logos, art or music. Use the names and palette in Branding and IP rules.
- Keep every API key server-side in Vercel environment variables. The browser only gets the public Mapbox token.
- Deploy after every working feature and test from the home-screen icon.
- Keep the core six features working at all times; extended features must not break them.
- Use Entire for sessions so the workflow can be shown for the Entire track.

Suggested structure:
```
app/            pages: map (home), missions, profile/[id], friends, leaderboard, wrapped
app/api/        reveal, missions/verify, missions, buses, radio, tags, heists, wrapped
components/     Map, FogLayer, Hud, MissionCard, MissionPassed, RankToast, Camera
lib/            db, h3, gemini, gtfs, auth, rep (scoring rules)
db/             schema.sql, seed.sql (missions, badges, collectibles, neighbourhoods)
public/         manifest.webmanifest, icons, goose boss art
```

Environment variables: `NEXT_PUBLIC_MAPBOX_TOKEN`, `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `DATABASE_URL` (Tiger Data), `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN` (or Vultr storage keys), `TTS_API_KEY`.

Gemini photo-check contract: send the image URL and the mission's criteria; require a JSON-only reply `{"pass": boolean, "confidence": number 0–1, "reason": string}`; treat `pass && confidence >= 0.6` as a pass.

Acceptance criteria for the core:
- [ ] App installs to the iPhone home screen and opens full screen with the sunset theme
- [ ] Map of London is covered in black fog; walking (or replay) clears hexes and updates % explored
- [ ] Zooming into Western tilts to 3D with extruded buildings; zooming out returns to 2D
- [ ] Only @uwo.ca accounts can sign in
- [ ] A photo mission can be completed end to end in under 30 seconds, with GPS and Gemini checks
- [ ] Completed missions appear on the profile and are visible to friends
- [ ] Friends can be added and compared
- [ ] Replay mode plays a recorded walk with fog clearing
