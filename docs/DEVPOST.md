# Devpost copy (paste-ready, no em dashes)

## About the project

```markdown
## Inspiration

Most of us didn't grow up in London. We arrive at 18, live inside a bubble of campus, Richmond Row and one bus route, and four years later most of us leave. We spend four years in a city and never actually meet it.

We already explore cities obsessively, just in games. Open-world games make you *want* to see what's behind the fog. So I asked: what if London was the open world?

## What it does

**Mustang City** is a GTA 6-inspired mobile web app that turns London, Ontario into **Forest State**, an open-world map covered in black fog. Western's campus is your home base, Mustang City, and the rest of the city is waiting to be uncovered.

**Claim all 42 regions.** Walking every street isn't realistic, so each of London's 42 neighbourhoods has a quest board built from real local places: set foot there, explore a few blocks, grab a coffee at a local café, and hit its signature spot. Finish 3 of 4 and the whole region's fog lifts at once. Your headline stat is simply *Regions 3/42*.

**Something to do everywhere.** Every region also has light side quests pinned to real spots: a photo op, riding in on a real LTC bus stop, a night shift, local trivia, a food crawl, a crew meet-up. They appear on the map as you zoom in, so the city view never gets cluttered.

**A reason to open it every day.** Three daily quests and a streak flame, plus three gold *surprise blips* a day that vanish at midnight.

**Beat your friends and your faculty.** A regions leaderboard (this week or all time, all of Western, your faculty or your crew) and a faculty war, where each region is held by the faculty with the most members who claimed it.

**It feels like a game.**
- **The Goose:** an original crime-boss quest-giver who *calls you* when you walk into a new region, voiced with Gemini.
- **MISSION PASSED:** photo missions to real landmarks checked by Gemini, with a chance of a golden 1.5× Rep roll.
- **Stash and carry:** loot drops into a limited bag, and it only counts once you bring it home to Mustang City.
- **Wanted level:** curiosity stars that heat up while you're on an exploring streak.
- **Atmosphere:** an original procedural synthwave soundtrack, a comic-panel title screen that bursts apart into the map, and photo mode for postcards.
- **Live data:** London Transit buses on the map in real time.
- **Graduation Wrapped:** the map of your four years, at the end.
- **Shareable reel:** a 9-second vertical video of your Forest State, recorded right on your phone, plus photo-mode postcards.
- **Seasonal events:** like Frost City this winter, when surprises pay double.
- **A first week that teaches itself:** an O-Week starter chain and coach marks.
- **Breaking news:** Forest FM cuts in when someone claims a region.
- **Accessibility mode:** wider check-ins and larger text.

**Graduate knowing your city.**

## How I built it

- **Frontend:** Next.js (App Router), TypeScript, Tailwind v4 and Motion, as a PWA for the iPhone home screen.
- **Map:** Mapbox GL JS (Standard style). Fog is an H3 hex grid smoothed into one polygon. Claimed regions are unioned into the fog's holes so they lift with a crisp border.
- **Real places:** 962 cafés, shops, parks and landmarks from OpenStreetMap, mapped to the City of London's 42 planning districts to generate every quest board.
- **AI:** the Gemini API handles photo verification, The Goose's dialogue, the radio host and every voice line through Gemini TTS. A strict rule covers all of it: facts come from stored, sourced text, and Gemini restyles them but never adds new ones.
- **Accounts and data:** Auth0 sign-in, with Supabase Postgres for region claims, leaderboards and the faculty war.
- **Live transit:** LTC GTFS and GTFS-Realtime.
- **Title screen:** the comic cover is exported as separate layers and animated on the compositor, so it stays smooth while the map loads.
- **Hosting:** Vercel, at mustangcity.rodeo (GoDaddy Registry).
- **Process:** built solo with AI coding agents, with every session checkpointed through Entire.

## Challenges

- **Making exploration realistic:** nobody walks a whole neighbourhood, which is why regions are claimed through quests at real local spots instead.
- **Custom 3D in Mapbox:** campus models needed non-interleaved buffers, uint16 indices and absolute URLs.
- **Fog that looks good:** raw hexagons look like a spreadsheet. Merging, smoothing and feathering them, plus crisp borders for claimed regions, took several passes.
- **Smooth animation during a heavy map load:** the title animation moved onto the browser compositor.
- **Accuracy vs personality:** The Goose is funny without inventing history, because of the fact guard.
- **Privacy:** there's no live location sharing. Friends see where you've been, never when.

## What I learned

How to bend a map engine into a game engine, how to design a progression loop people can actually finish, how to keep an LLM useful without letting it make things up, and how to scope as a solo builder.

## What's next

Real multiplayer heists, seasonal events (Homecoming, a Halloween hunt), local businesses sponsoring region quests, and photo-real campus facades.
```

## Built with

```
next.js, typescript, react, tailwind-css, motion, mapbox, mapbox-gl-js, h3, openstreetmap, gltf, auth0, supabase, postgresql, gemini, google-gemini, gtfs, gtfs-realtime, open-meteo, web-audio-api, vercel, pwa, node.js, javascript, claude-code, entire
```

## Try it out

- https://www.mustangcity.rodeo
- https://github.com/RyanPeters06/mustang-city
