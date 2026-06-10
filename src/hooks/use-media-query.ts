"use client";

import { useState, useEffect } from "react";

/**
 * SSR-safe media query hook. Returns null on the server and during the
 * first client render (so prerendered HTML never mismatches), then the
 * live boolean, updated on viewport changes.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
