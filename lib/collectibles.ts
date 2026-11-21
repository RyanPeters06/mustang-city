/**
 * Hidden collectibles (brief → Extended): invisible until you're within ~50 m. Each carries ONE stored, sourced
 * fact (accuracy rule) — Gemini may restyle it but never adds facts. Mirrors db/seed.sql `collectibles`.
 */
import type { LngLat } from "./geo";

export const COLLECTIBLE_REP = 25; // brief → Rep table
export const FIND_RADIUS_M = 50;

export type Collectible = { id: string; name: string; lngLat: LngLat; lore: string; sourceUrl: string; sourceName: string };

export const COLLECTIBLES: Collectible[] = [
  { id: "lost-planks", name: "Lost Bridge Planks", lngLat: [-81.2595, 42.9876], lore: "Two earlier timber bridges at the Blackfriars crossing failed in floods before the iron bridge was built.", sourceUrl: "https://historicplaces.ca/en/rep-reg/place-lieu.aspx?id=10079", sourceName: "Canada's Historic Places" },
  { id: "railroad-rivet", name: "Railroad Rivet", lngLat: [-81.2577, 42.9884], lore: "Bridge builder Isaac Crouse learned his trade working for the Central Pacific Railroad in Nevada in the late 1860s.", sourceUrl: "https://www.lpl.ca/books-digital/explore/london-room/local-historic-sites/isaac-crouse", sourceName: "London Public Library" },
  { id: "jailhouse-key", name: "Jailhouse Key", lngLat: [-81.2546, 42.9824], lore: "A jail was attached to the court house's west side in 1846; an eastward extension and a massive central tower followed by 1878.", sourceUrl: "https://en.wikipedia.org/wiki/Middlesex_County_Court_House_(London,_Ontario)", sourceName: "Wikipedia" },
  { id: "district-seal", name: "District Seal", lngLat: [-81.2561, 42.9841], lore: "The first settlement at the Forks of the Thames came in 1826, when it became the administrative capital of the London District.", sourceUrl: "https://epe.lac-bac.gc.ca/100/205/301/ic/cdc/london/theforks.html", sourceName: "Library and Archives Canada" },
  { id: "box-seat-ticket", name: "Box Seat Ticket", lngLat: [-81.2504, 42.9863], lore: "Ambrose Small had his own box seat on stage right at the Grand Theatre for many years.", sourceUrl: "https://www.historicplaces.ca/en/rep-reg/place-lieu.aspx?id=13715", sourceName: "Canada's Historic Places" },
  { id: "fair-licence", name: "1835 Fair Licence", lngLat: [-81.2493, 42.9820], lore: "Before the 1845 market site, an 1835 patent allowed a public fair or mart around Richmond, Dundas and King Streets.", sourceUrl: "https://coventmarket.com/market-history", sourceName: "Covent Garden Market" },
  { id: "dedication-ribbon", name: "Dedication Ribbon", lngLat: [-81.2474, 42.9897], lore: "Governor General Lord Dufferin dedicated Victoria Park in 1874.", sourceUrl: "https://londonhistoryonline.museumlondon.ca", sourceName: "Museum London — London History Online" },
  { id: "unfinished-spire", name: "Spire Sketch", lngLat: [-81.2493, 42.9870], lore: "St. Peter's towers, sacristy and chapel were completed in 1957–58, decades after the cathedral was dedicated in 1885.", sourceUrl: "https://en.wikipedia.org/wiki/St._Peter%27s_Cathedral_Basilica_(London,_Ontario)", sourceName: "Wikipedia" },
  { id: "architects-pencil", name: "Architect's Pencil", lngLat: [-81.2561, 42.9828], lore: "Museum London's building was designed by Raymond Moriyama, the architect of Science North in Sudbury.", sourceUrl: "https://en.wikipedia.org/wiki/Museum_London", sourceName: "Wikipedia" },
  { id: "jury-trowel", name: "The Jurys' Trowel", lngLat: [-81.2729, 43.0099], lore: "The Museum of Ontario Archaeology began at Western in 1933, founded by Wilfrid Jury and his father Amos.", sourceUrl: "https://en.wikipedia.org/wiki/Museum_of_Ontario_Archaeology", sourceName: "Wikipedia" },
  { id: "register-stamp", name: "Register Stamp", lngLat: [-81.3066, 43.0128], lore: "In 2004 the Lawson site became the first archaeological site in Ontario placed on the Canadian Register of Historic Places.", sourceUrl: "https://en.wikipedia.org/wiki/Museum_of_Ontario_Archaeology", sourceName: "Wikipedia" },
  { id: "royal-visitor-pass", name: "Royal Visitor Pass", lngLat: [-81.2306, 43.0016], lore: "The Royal Canadian Regiment Museum officially opened in 1983, during a royal visit by Prince Philip.", sourceUrl: "https://en.wikipedia.org/wiki/Royal_Canadian_Regiment_Museum", sourceName: "Wikipedia" },
];
