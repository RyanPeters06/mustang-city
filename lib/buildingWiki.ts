/**
 * Campus buildings that have a Wikipedia article (titles confirmed via Wikipedia search, 2026-11-21).
 * History shown in the app is the article's own summary + a link — never generated (brief → Accuracy rule).
 */
export const BUILDING_WIKI: Record<string, { title: string; note?: string }> = {
  "Middlesex College": { title: "Middlesex College (University of Western Ontario)" },
  "Spencer Engineering Building": { title: "Spencer Engineering Building" },
  "Huron University College": { title: "Huron University College" },
  "Cronyn Observatory": { title: "Hume Cronyn Memorial Observatory" },
  "Brescia University College": { title: "Brescia University College" },
  "Richard Ivey Building": { title: "Ivey Business School", note: "Home of the Ivey Business School" },
  "Thompson Arena": { title: "Thompson Recreation and Athletic Centre" },
  "Weldon Library": { title: "Western Libraries", note: "Part of Western Libraries" },
  "Taylor Library": { title: "Western Libraries", note: "Part of Western Libraries" },
  "Robarts Research Institute": { title: "Robarts Research Institute" },
};
