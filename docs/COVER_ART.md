# Cover art + app icon: generation guide

Goal: a fragmented comic-panel collage (the classic open-world game cover layout), all London, Ontario themed,
for the intro title card, Devpost thumbnail and app icon. **Original art only**: no GTA/Rockstar names, logo,
typeface or characters; no copying of existing covers. The *layout style* is generic and fine.

## Rules for every prompt
- Never write "GTA", "Grand Theft Auto", "Rockstar" or "Vice City" in a prompt, and never upload an existing game cover as
  a reference image (image-to-image would copy it).
- No text or logos in the images. The Mustang City / Forest State wordmark is added in code.
- Fictional characters only: no real people, and no real brand logos (LTC, Western crest, store signs).
- Save each panel separately as PNG, about 1024 px. Keep the same style line on every prompt so the panels match.

## Style line (paste at the start of every panel prompt)
> Bold comic-book illustration, thick clean ink outlines, cel shading, saturated sunset palette of hot pink, orange, gold,
> purple and teal, dramatic low angle, cinematic lighting, grainy print texture, no text, no logos.

## Panels (pick 6–8)
1. **The Goose**: a Canada goose crime boss in a black fedora with a pink band, aviator sunglasses and a gold chain, looking down at the viewer.
2. **Blackfriars Bridge**: the white iron bowstring truss bridge over a river at sunset, a cyclist crossing, low angle.
3. **The clock tower**: a sandstone collegiate-gothic tower with a green copper spire and a glowing clock face at dusk, students below.
4. **The hero**: a university student in a purple hoodie (no crest) sprinting up a grassy hill holding a phone that glows with a map.
5. **City bus**: a green-and-yellow city bus (no logos) racing through a downtown street at night, motion blur, neon reflections.
6. **Covent Garden**: a busy indoor food market, a vendor tossing an apple, warm light.
7. **The Forks**: two friends in a canoe where two rivers meet, a modern museum building and a castle-like brick courthouse behind them.
8. **Haunted theatre**: a ghostly 1900s theatre owner in a top hat in a red velvet balcony box, a marquee glow.
9. **Goose attack**: an angry Canada goose spreading its wings at a startled student on a campus path, comedic.
10. **Richmond Row at night**: neon storefronts, students on scooters, light snow.

## Full collage (optional, one image)
> [style line] A single poster made of 9 angled comic panels separated by thick black gutters, arranged like a classic
> video game cover, with an empty rectangular space in the centre for a title. Panels: [list 8 of the subjects above].
> Portrait 9:16, no text.

## App icon
> [style line] A square app icon: one comic panel with a thick black border, a fierce mustang horse head in profile
> breaking out of the panel, a striped sunset disc behind it, tiny pine silhouettes at the bottom, bold and simple
> enough to read at 60 px, no text.

Alternative icon subject: The Goose's head in fedora and aviators.

Export 1024×1024 PNG, no transparency, with the main subject inside the centre 80% (iOS and Android crop the edges).
I'll make the 180, 192 and 512 px versions and the maskable variant.

## Where to generate (Nov 2026)
- **Gemini app or Google AI Studio (Nano Banana image model):** recommended. Free to start, strong at keeping one
  style across many panels, and it fits the Gemini sponsor-prize story.
- **Midjourney:** the best look for stylised comic illustration, but paid. Use `--ar 1:1` for panels and `--ar 9:16` for the collage.
- **Adobe Firefly:** the safest licensing (trained on licensed content) if commercial use matters later.
- **ChatGPT image generation:** good at following long prompts and making edits one panel at a time.
- Whichever you use, check its terms allow public and commercial use, and note the tool and prompts in this file.

## Handing over
Drop the PNGs in chat (or commit them to `public/cover/`). I'll handle the angled frames, colour grading, panel
animation, wordmark, intro integration, Devpost thumbnail and icon sizes.
