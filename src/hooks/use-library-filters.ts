"use client";

import { useState, useEffect, useMemo } from "react";
import { genreMatchesFilter } from "@/lib/tmdb";
import type { Entry, MediaType } from "@/lib/types";

const SORT_OPTIONS = [
  { key: "my_rating", label: "Rating" },
  { key: "title", label: "Title" },
  { key: "year", label: "Year" },
  { key: "tmdb_rating", label: "TMDB" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["key"];
export { SORT_OPTIONS };

const RECENTLY_ADDED_TAG = "Recently Added";
export { RECENTLY_ADDED_TAG };

/**
 * Manages filter, sort, and search state for the library page.
 * Returns filtered/sorted entries, derived tag lists, and filter controls.
 */
export function useLibraryFilters(entries: Entry[], activeMediaType: MediaType, mediaTab: MediaType) {
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("my_rating");
  const [searchQuery, setSearchQuery] = useState("");

  // Reset filters on tab change
  useEffect(() => {
    setGenreFilter(null);
    setTagFilter(null);
    setSearchQuery("");
  }, [mediaTab]);

  const mediaEntries = useMemo(
    () => entries.filter((e) => e.media_type === activeMediaType),
    [entries, activeMediaType]
  );

  // IDs of the most recently added entries (20 movies, 10 TV)
  const recentlyAddedIds = useMemo(() => {
    const allSorted = [...entries].sort((a, b) => (b.added_at || "").localeCompare(a.added_at || ""));
    const recentMovies = allSorted.filter((e) => e.media_type === "movie").slice(0, 20);
    const recentTv = allSorted.filter((e) => e.media_type === "tv").slice(0, 10);
    return new Set([...recentMovies, ...recentTv].map((e) => e.id));
  }, [entries]);

  const topTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    mediaEntries.forEach((e) =>
      e.tags?.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; })
    );
    const tags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
    return [RECENTLY_ADDED_TAG, ...tags.filter((t) => t !== RECENTLY_ADDED_TAG)];
  }, [mediaEntries]);

  const filteredEntries = useMemo(() => {
    let result = mediaEntries;
    if (genreFilter) result = result.filter((e) => genreMatchesFilter(e.genres, genreFilter));
    if (tagFilter) {
      if (tagFilter === RECENTLY_ADDED_TAG) {
        result = result.filter((e) => recentlyAddedIds.has(e.id));
      } else {
        result = result.filter((e) => e.tags?.includes(tagFilter));
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (tagFilter === RECENTLY_ADDED_TAG) return (b.added_at || "").localeCompare(a.added_at || "");
      switch (sortBy) {
        case "my_rating": return (b.my_rating || 0) - (a.my_rating || 0);
        case "title": return a.title.localeCompare(b.title);
        case "year": return (b.year || "").localeCompare(a.year || "");
        case "tmdb_rating": return (b.tmdb_rating || 0) - (a.tmdb_rating || 0);
        default: return 0;
      }
    });
  }, [mediaEntries, genreFilter, tagFilter, searchQuery, sortBy, recentlyAddedIds]);

  const activeFilterCount = (genreFilter ? 1 : 0) + (tagFilter ? 1 : 0) + (searchQuery ? 1 : 0);

  function clearFilters() {
    setGenreFilter(null);
    setTagFilter(null);
    setSearchQuery("");
  }

  return {
    genreFilter,
    setGenreFilter,
    tagFilter,
    setTagFilter,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    mediaEntries,
    filteredEntries,
    topTags,
    activeFilterCount,
    clearFilters,
  };
}
