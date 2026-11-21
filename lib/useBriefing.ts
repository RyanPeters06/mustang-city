"use client";

import { useEffect, useState } from "react";

const cache = new Map<string, string>(); // slug → briefing text for this session

/** The Goose's briefing: stored text immediately, swapped for the in-character rewrite if the server has one. */
export function useBriefing(slug: string, stored: string): string {
  const [rewrites, setRewrites] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cache.has(slug)) return;
    const ctrl = new AbortController();
    fetch(`/api/missions/briefing?slug=${encodeURIComponent(slug)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ text?: string; source?: string }>) : null))
      .then((j) => {
        if (j?.source !== "gemini" || !j.text) return;
        cache.set(slug, j.text);
        setRewrites((prev) => ({ ...prev, [slug]: j.text! }));
      })
      .catch(() => {}); // offline / aborted → stored text stays
    return () => ctrl.abort();
  }, [slug]);

  return rewrites[slug] ?? cache.get(slug) ?? stored;
}
