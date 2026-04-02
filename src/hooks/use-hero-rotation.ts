"use client";

import { useState, useCallback, useEffect } from "react";

const ROTATION_INTERVAL_MS = 5000;

/**
 * Auto-rotates a "hero" entry from a list of candidates.
 * Used on Library, Favourites, Watchlist, and Discover pages for the mobile hero banner.
 */
export function useHeroRotation<T>(
  candidates: T[],
  filter?: (item: T) => boolean
) {
  const [heroEntry, setHeroEntry] = useState<T | null>(null);

  const pickHero = useCallback(() => {
    const pool = filter ? candidates.filter(filter) : candidates;
    if (pool.length > 0) {
      setHeroEntry(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [candidates, filter]);

  useEffect(() => {
    pickHero();
    const interval = setInterval(pickHero, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pickHero]);

  return heroEntry;
}
