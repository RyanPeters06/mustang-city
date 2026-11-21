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
