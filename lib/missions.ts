/**
 * Missions bundled with the app (mirrors db/seed.sql so the demo never depends on the DB).
 * Landmark `brief` text is stored, sourced fact — never generated (brief → Accuracy rule).
 */
import { distanceM, type LngLat } from "./geo";

export type MissionType = "photo" | "checkin" | "bus" | "heist";
export type MissionCategory = "history" | "film_tv" | "viral";

export type Mission = {
  slug: string;
  title: string;
  briefing: string; // The Goose, in character
  type: MissionType;
  lngLat: LngLat;
  radiusM: number;
  criteria: string; // plain-language check sent to Gemini
  rep: number;
  category?: MissionCategory;
  brief?: string;
  year?: number;
  sourceUrl?: string;
  sourceName?: string;
};

export const MISSIONS: Mission[] = [
  // ---- Landmarks (verified facts) ----
  {
    slug: "banting-house",
    title: "The Idea That Changed Medicine",
    briefing: "A doctor had one idea in this house and the whole world owes him. Pay your respects. Bring proof.",
    type: "photo",
    lngLat: [-81.2398, 42.9926],
    radiusM: 75,
    criteria: "Photo shows the Frederick Banting statue or the exterior of Banting House.",
    rep: 100,
    category: "history",
    brief: "Here, early on October 31, 1920, Frederick Banting had the idea that led to insulin; it is now a National Historic Site with a statue of him outside.",
    year: 1920,
    sourceUrl: "https://parks.canada.ca/lhn-nhs/on/banting",
    sourceName: "Parks Canada",
  },
  {
    slug: "eldon-house",
    title: "Oldest House in Forest State",
    briefing: "Some houses remember everything. Find the oldest one in town and get its good side.",
    type: "photo",
    lngLat: [-81.2522, 42.9862],
    radiusM: 75,
    criteria: "Photo shows Eldon House, a historic two-storey house, or its grounds in Harris Park.",
    rep: 100,
    category: "history",
    brief: "Built in 1834 by Captain John Harris; London's oldest remaining house, given to the city in 1959.",
    year: 1834,
    sourceUrl: "https://en.wikipedia.org/wiki/Eldon_House",
    sourceName: "Wikipedia",
  },
  {
    slug: "changeling-richmond",
    title: "Fake New York",
    briefing: "For one summer this block played a whole other city. Stand where the cameras stood.",
    type: "photo",
    lngLat: [-81.248, 42.9845],
    radiusM: 100,
    criteria: "Photo shows a downtown street with storefronts on Richmond Street.",
    rep: 100,
    category: "film_tv",
    brief: "In August 2022 the Apple TV+ series The Changeling turned a block of Richmond Street into 1980s New York City.",
    year: 2022,
    sourceUrl: "https://www.cbc.ca/news/canada/london",
    sourceName: "CBC News",
  },
  {
    slug: "fubar-fanshawe",
    title: "Action Star Was Here",
    briefing: "A very famous action hero blew things up out here. Go find the water. Don't blow anything up.",
    type: "checkin",
    lngLat: [-81.183, 43.036],
    radiusM: 250,
    criteria: "User is at Fanshawe Conservation Area.",
    rep: 100,
    category: "film_tv",
    brief: "Arnold Schwarzenegger filmed Netflix's FUBAR season 2 here.",
    sourceUrl: "https://www.londontourism.ca",
    sourceName: "Tourism London",
  },
  {
    slug: "labatt-park",
    title: "Little League Legends",
    briefing: "Oldest ballpark vibes. Get the diamond in frame. No bunting.",
    type: "photo",
    lngLat: [-81.2577, 42.985],
    radiusM: 100,
    criteria: "Photo shows the baseball diamond, grandstand or entrance of Labatt Memorial Park.",
    rep: 100,
    category: "film_tv",
    brief: "The little league baseball movie You Gotta Believe filmed here.",
    sourceUrl: "https://globalnews.ca",
    sourceName: "Global News",
  },
  {
    slug: "amazing-race-thames",
    title: "Race Leg on the Thames",
    briefing: "A reality race came through my campus without asking. Get to the river and see what they saw.",
    type: "photo",
    lngLat: [-81.2787, 43.0072],
    radiusM: 120,
    criteria: "Photo shows the Thames River near Western campus.",
    rep: 100,
    category: "film_tv",
    brief: "The Amazing Race Canada season 8, episode 6 ran a full leg in London, including downtown, the Thames River and Western's campus.",
    sourceUrl: "https://www.filmlondon.ca",
    sourceName: "Film London",
  },
  // ---- London landmarks (feature 012: researched, geocoded, sourced) ----
  {
    slug: "blackfriars-bridge",
    title: "Mail-Order Bridge",
    briefing: "This bridge came in a box and it's still standing. Respect the iron. Get it in frame.",
    type: "photo",
    lngLat: [-81.2585, 42.9878],
    radiusM: 100,
    criteria: "Photo shows the white iron truss of Blackfriars Bridge over the river.",
    rep: 100,
    category: "history",
    brief: "Made by the Wrought Iron Bridge Company of Canton, Ohio, and assembled here by Isaac Crouse, Blackfriars Bridge opened on September 27, 1875; it was rebuilt in 2018.",
    year: 1875,
    sourceUrl: "https://historicplaces.ca/en/rep-reg/place-lieu.aspx?id=10079",
    sourceName: "Canada's Historic Places",
  },
  {
    slug: "old-courthouse",
    title: "The Castle on Ridout",
    briefing: "There's a castle downtown and nobody acts like it's weird. Go see the towers.",
    type: "photo",
    lngLat: [-81.2536, 42.9815],
    radiusM: 90,
    criteria: "Photo shows the Middlesex County Court House, a castle-like brick building with towers.",
    rep: 100,
    category: "history",
    brief: "The Middlesex County Court House, an early Gothic Revival building with castle-like towers and crenellations, was completed in 1829 and named a National Historic Site in 1955.",
    year: 1829,
    sourceUrl: "https://www.pc.gc.ca/apps/dfhd/page_nhs_eng.aspx?id=415",
    sourceName: "Parks Canada",
  },
  {
    slug: "covent-garden-market",
    title: "The Old Market",
    briefing: "Every good operation needs a supplier. Find the market and check in with the vendors.",
    type: "checkin",
    lngLat: [-81.2501, 42.9824],
    radiusM: 80,
    criteria: "User is at Covent Garden Market.",
    rep: 100,
    category: "history",
    brief: "Covent Garden Market has traded on this downtown block since land was donated for it in 1845; a Museum London label dates its opening to November 1, 1845.",
    year: 1845,
    sourceUrl: "https://coventmarket.com/market-history",
    sourceName: "Covent Garden Market",
  },
  {
    slug: "grand-theatre-ghost",
    title: "The Man Who Vanished",
    briefing: "The guy who ran this place walked out one night and never came back. Some say he never left. Go look.",
    type: "photo",
    lngLat: [-81.251, 42.9859],
    radiusM: 80,
    criteria: "Photo shows the Grand Theatre's exterior or marquee on Richmond Street.",
    rep: 100,
    category: "history",
    brief: "The Grand Theatre opened in 1901. Owner Ambrose Small sold his theatre holdings on December 2, 1919 and disappeared; the case was never solved, and local lore says his ghost haunts the building.",
    year: 1919,
    sourceUrl: "https://www.thecanadianencyclopedia.ca/en/article/grand-theatre",
    sourceName: "The Canadian Encyclopedia",
  },
  {
    slug: "st-peters-basilica",
    title: "Twin Towers of Dufferin",
    briefing: "Big stone, big towers, very old. Go stand in front of it and look up.",
    type: "photo",
    lngLat: [-81.2502, 42.9874],
    radiusM: 90,
    criteria: "Photo shows the twin-towered stone exterior of St. Peter's Cathedral Basilica.",
    rep: 100,
    category: "history",
    brief: "St. Peter's Cathedral Basilica was built in French Gothic Revival style from 1880 to 1885 and was raised to a minor basilica in 1961.",
    year: 1885,
    sourceUrl: "https://www.heritagetrust.on.ca/plaques/st-peters-cathedral-basilica",
    sourceName: "Ontario Heritage Trust",
  },
  {
    slug: "storybook-gardens",
    title: "Once Upon a Park",
    briefing: "Every boss started somewhere small. Go to the place where half this city had their first adventure.",
    type: "checkin",
    lngLat: [-81.3168, 42.9576],
    radiusM: 150,
    criteria: "User is at Storybook Gardens in Springbank Park.",
    rep: 150,
    category: "history",
    brief: "Storybook Gardens opened in Springbank Park in 1958 and is still owned and run by the City of London.",
    year: 1958,
    sourceUrl: "https://london.ca/storybookgardens/about-us",
    sourceName: "City of London",
  },
  {
    slug: "forks-of-the-thames",
    title: "The Capital That Wasn't",
    briefing: "Somebody once picked this exact spot to run the whole province. Didn't happen. Stand where it almost did.",
    type: "checkin",
    lngLat: [-81.2575, 42.9832],
    radiusM: 110,
    criteria: "User is at the Forks of the Thames, near Ivey Park.",
    rep: 100,
    category: "history",
    brief: "In 1793 Lieutenant-Governor John Graves Simcoe chose the Forks of the Thames as the future capital of Upper Canada and named it New London; the capital went to York (Toronto) instead.",
    year: 1793,
    sourceUrl: "https://london.ca/heritage",
    sourceName: "City of London",
  },
  {
    slug: "victoria-park-garrison",
    title: "Barracks to Bandshell",
    briefing: "Before the concerts and skating, soldiers drilled here. Get the park in frame.",
    type: "photo",
    lngLat: [-81.2483, 42.989],
    radiusM: 140,
    criteria: "Photo shows Victoria Park: lawns, trees, the bandshell or the skating area.",
    rep: 100,
    category: "history",
    brief: "British troops garrisoned this ground from 1838; in 1874 it passed to the city and became Victoria Park, named for Queen Victoria.",
    year: 1874,
    sourceUrl: "https://historicplaces.ca/en/rep-reg/place-lieu.aspx?id=10655",
    sourceName: "Canada's Historic Places",
  },
  {
    slug: "lawson-village",
    title: "The Village Before the City",
    briefing: "Long before any of us, people built a whole town up here. Go pay respects. Quietly.",
    type: "checkin",
    lngLat: [-81.3056, 43.0135],
    radiusM: 150,
    criteria: "User is at the Museum of Ontario Archaeology and Lawson site.",
    rep: 150,
    category: "history",
    brief: "The Lawson site is a palisaded Neutral Iroquoian village occupied around 1500–1525; the Museum of Ontario Archaeology moved beside it in 1981 and continues to excavate and reconstruct it.",
    year: 1500,
    sourceUrl: "https://www.thecanadianencyclopedia.ca/en/article/lawson-archaeological-site",
    sourceName: "The Canadian Encyclopedia",
  },
  {
    slug: "wolseley-hall",
    title: "The Old Barracks",
    briefing: "This is where the toughest crew in the country got its start. Get the building. Don't salute anyone you don't know.",
    type: "photo",
    lngLat: [-81.2316, 43.0011],
    radiusM: 100,
    criteria: "Photo shows Wolseley Hall, a red-brick barracks building with a tower, on Oxford Street East.",
    rep: 100,
    category: "history",
    brief: "Wolseley Hall (1886–88) was the first purpose-built infantry school erected by the Dominion government and home of the unit that became The Royal Canadian Regiment; it was named a National Historic Site in 1963.",
    year: 1886,
    sourceUrl: "https://www.pc.gc.ca/apps/dfhd/page_nhs_eng.aspx?id=417",
    sourceName: "Parks Canada",
  },
  {
    slug: "uc-memorial-tower",
    title: "The Memorial Tower",
    briefing: "Everyone takes a picture of this tower. Fine. Take yours. But know why it's there.",
    type: "photo",
    lngLat: [-81.274, 43.0093],
    radiusM: 70,
    criteria: "Photo shows the stone tower of University College at Western.",
    rep: 100,
    category: "history",
    brief: "University College was built from 1922 to 1924; its Middlesex Memorial Tower was funded partly by a $100,000 gift from Middlesex County and dedicated to county men who died in the First World War.",
    year: 1924,
    sourceUrl: "https://en.wikipedia.org/wiki/University_College_(University_of_Western_Ontario)",
    sourceName: "Wikipedia",
  },
  // ---- Heists (feature 016): need 3+ players at the spot within 15 minutes ----
  {
    slug: "alumni-hall-heist",
    title: "The Encore",
    briefing: "Big job, big room. I need three of you at the hall at the same time. Not two. Three.",
    type: "heist",
    lngLat: [-81.2748, 43.006],
    radiusM: 120,
    criteria: "Three or more players check in at Alumni Hall within 15 minutes.",
    rep: 300,
  },
  {
    slug: "thompson-heist",
    title: "Cold Cash",
    briefing: "The rink is colder than my heart. Bring a crew of three and get in and out together.",
    type: "heist",
    lngLat: [-81.2756, 43.0028],
    radiusM: 120,
    criteria: "Three or more players check in at Thompson Arena within 15 minutes.",
    rep: 300,
  },
  {
    slug: "ivey-heist",
    title: "The Business Plan",
    briefing: "These folks plan everything. So do I. Three of you, one building, fifteen minutes.",
    type: "heist",
    lngLat: [-81.2774, 43.0042],
    radiusM: 120,
    criteria: "Three or more players check in at the Ivey Business School within 15 minutes.",
    rep: 300,
  },
  // ---- Mustang City starters ----
  {
    slug: "middlesex-study-spot",
    title: "The Secret Study Spot",
    briefing: "There's a quiet corner in Middlesex nobody talks about. Find it. Tell no one. Except me.",
    type: "photo",
    lngLat: [-81.27025, 43.00936],
    radiusM: 60,
    criteria: "Photo shows an indoor study space inside a stone university building.",
    rep: 100,
  },
  {
    slug: "goose-sighting",
    title: "Meet The Family",
    briefing: "My cousins run this campus. Photograph one. Keep your distance. They bite. I bite.",
    type: "photo",
    lngLat: [-81.2737, 43.0096],
    radiusM: 400,
    criteria: "Photo clearly shows at least one Canada goose.",
    rep: 100,
  },
  {
    slug: "uc-hill-summit",
    title: "King of the Hill",
    briefing: "Stand at the top of UC Hill and look over your kingdom. Then get back to work.",
    type: "photo",
    lngLat: [-81.2737, 43.0089],
    radiusM: 60,
    criteria: "Photo taken from the top of a grassy hill looking over a university campus.",
    rep: 100,
  },
  {
    slug: "the-spoke",
    title: "Find The Spoke",
    briefing: "Every crew needs a hangout. Locate The Spoke. Coffee is on you.",
    type: "checkin",
    lngLat: [-81.27621, 43.00865],
    radiusM: 60,
    criteria: "User is at The Spoke cafe in the University Community Centre.",
    rep: 100,
  },
  {
    slug: "gates-of-western",
    title: "The Gates",
    briefing: "Every legend starts at the gates. Get the arch in frame. Look tough.",
    type: "photo",
    lngLat: [-81.2683, 43.0052],
    radiusM: 80,
    criteria: "Photo shows the stone entrance gates of Western University.",
    rep: 100,
  },
  {
    slug: "weldon-night",
    title: "Library After Dark",
    briefing: "Weldon never sleeps. Neither do you, apparently. Check in.",
    type: "checkin",
    lngLat: [-81.27565, 43.00789],
    radiusM: 60,
    criteria: "User is at Weldon Library.",
    rep: 100,
  },
  {
    slug: "old-east-bus",
    title: "Ride East",
    briefing: "Take a bus to Old East Village. Don't walk. I'll know.",
    type: "bus",
    lngLat: [-81.223, 42.989],
    radiusM: 150,
    criteria: "User arrives in Old East Village by bus.",
    rep: 150,
  },
  {
    slug: "richmond-row",
    title: "Strip Patrol",
    briefing: "Walk the Row. Find the busiest corner. Report back.",
    type: "checkin",
    lngLat: [-81.251, 42.9935],
    radiusM: 120,
    criteria: "User is on Richmond Row.",
    rep: 100,
  },
];

export const missionBySlug = (slug: string) => MISSIONS.find((m) => m.slug === slug);

export const TYPE_LABEL: Record<MissionType, string> = {
  photo: "Photo",
  checkin: "Check-in",
  bus: "Bus ride",
  heist: "Heist",
};

export const CATEGORY_LABEL: Record<MissionCategory, string> = {
  history: "History",
  film_tv: "Film & TV",
  viral: "Viral",
};

/** Deterministic "somewhere around here" centre for a fogged landmark (≤ 90 m from the real spot). */
export function approxCenter(m: Mission): LngLat {
  let h = 0;
  for (const ch of m.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  const dist = 40 + (h % 50); // metres
  const dLat = (dist * Math.cos(angle)) / 111320;
  const dLng = (dist * Math.sin(angle)) / (111320 * Math.cos((m.lngLat[1] * Math.PI) / 180));
  return [m.lngLat[0] + dLng, m.lngLat[1] + dLat];
}

export const missionDistance = (m: Mission, from: LngLat | null) => (from ? distanceM(from, m.lngLat) : null);

export function formatDistance(m: number | null) {
  if (m === null) return null;
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}
