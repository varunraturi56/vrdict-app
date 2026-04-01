"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Radar, Search, Plus, Bookmark, Check, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { MobileDropdown } from "@/components/ui/mobile-dropdown";
import { createClient } from "@/lib/supabase/client";
import { useEntries } from "@/lib/entries-context";
import {
  posterUrl,
  GENRE_IDS,
  type TmdbSearchResult,
  getDisplayTitle,
  getYear,
} from "@/lib/tmdb";
import { MAJOR_GENRES, ERAS, type MediaType } from "@/lib/types";
import { TvFrame } from "@/components/ui/tv-frame";
import { LedBars } from "@/components/ui/led-bar";
import { PreviewBar } from "@/components/ui/preview-bar";
import { TvCategorySelect } from "@/components/ui/tv-category-select";
import { AddModal } from "@/components/add-modal";
import { PAGE_GLOWS } from "@/lib/ambient-colors";

const SORT_OPTIONS = [
  { key: "vote_average.desc", label: "TMDB" },
  { key: "popularity.desc", label: "Popular" },
  { key: "primary_release_date.desc", label: "Year" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

const ITEMS_PER_PAGE = 14;

type FlowState =
  | { stage: "category" }
  | { stage: "results"; mediaType: MediaType };

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverContent />
    </Suspense>
  );
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mediaTab = (searchParams.get("tab") || "movie") as MediaType;

  // Filters
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortKey>("vote_average.desc");
  const [ratingFilter, setRatingFilter] = useState<string>("Any");
  const [keywords, setKeywords] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [ratingDropOpen, setRatingDropOpen] = useState(false);
  const ratingDropRef = useRef<HTMLDivElement>(null);

  // Results — restore from sessionStorage if available for instant display
  const [results, setResults] = useState<TmdbSearchResult[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = sessionStorage.getItem(`discover_${mediaTab}`);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem(`discover_${mediaTab}`);
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Custom dropdown state + refs
  const [eraDropOpen, setEraDropOpen] = useState(false);
  const [sortDropOpen, setSortDropOpen] = useState(false);
  const eraDropRef = useRef<HTMLDivElement>(null);
  const sortDropRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (eraDropRef.current && !eraDropRef.current.contains(e.target as Node)) setEraDropOpen(false);
      if (sortDropRef.current && !sortDropRef.current.contains(e.target as Node)) setSortDropOpen(false);
      if (ratingDropRef.current && !ratingDropRef.current.contains(e.target as Node)) setRatingDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Guards via refs
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);

  // Existing IDs
  const [existingTmdbIds, setExistingTmdbIds] = useState<Set<string>>(new Set());
  const existingIdsRef = useRef(existingTmdbIds);
  existingIdsRef.current = existingTmdbIds;
  const [addingToWatchlist, setAddingToWatchlist] = useState<number | null>(null);
  const [selectedResult, setSelectedResult] = useState<TmdbSearchResult | null>(null);

  // Mobile infinite scroll — callback ref so observer attaches when sentinel mounts
  const fetchRef = useRef<() => void>(() => {});
  fetchRef.current = () => {
    if (hasMoreRef.current && !loadingRef.current) {
      fetchDiscover(pageRef.current, true);
    }
  };
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchRef.current(); },
      { rootMargin: "400px" }
    );
    observerRef.current.observe(node);
  }, []);

  // TV frame
  const [tvOn, setTvOn] = useState(true);
  const [peekedResult, setPeekedResult] = useState<TmdbSearchResult | null>(null);

  // Hero banner (mobile) — auto-rotate every 5s
  const [heroResult, setHeroResult] = useState<TmdbSearchResult | null>(null);
  const pickHero = useCallback(() => {
    if (results.length === 0) return;
    setHeroResult(results[Math.floor(Math.random() * Math.min(results.length, 20))]);
  }, [results]);

  useEffect(() => {
    pickHero();
    const interval = setInterval(pickHero, 5000);
    return () => clearInterval(interval);
  }, [pickHero]);

  // Keyword resolution
  const [resolvedKeywordIds, setResolvedKeywordIds] = useState<string>("");

  // Desktop flow state
  const hasTab = searchParams.get("tab");
  const [flow, setFlow] = useState<FlowState>(
    hasTab
      ? { stage: "results", mediaType: (hasTab || "movie") as MediaType }
      : { stage: "category" }
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setFlow({ stage: "results", mediaType: tab as MediaType });
    } else {
      setFlow({ stage: "category" });
    }
  }, [searchParams]);

  // Derive existing entry IDs from shared context + fetch watchlist IDs
  const { entries: sharedEntries, loading: entriesLoading } = useEntries();
  const [existingLoaded, setExistingLoaded] = useState(false);
  useEffect(() => {
    if (entriesLoading) return;
    async function loadWatchlist() {
      const supabase = createClient();
      const { data: watchlist } = await supabase.from("watchlist").select("tmdb_id, media_type");
      const ids = new Set<string>();
      sharedEntries.forEach((e) => ids.add(`${e.media_type}_${e.tmdb_id}`));
      watchlist?.forEach((w) => ids.add(`watchlist_${w.media_type}_${w.tmdb_id}`));
      setExistingTmdbIds(ids);
      existingIdsRef.current = ids;
      setExistingLoaded(true);
    }
    loadWatchlist();
  }, [entriesLoading, sharedEntries]);

  // Resolve keywords to TMDB keyword IDs (debounced)
  useEffect(() => {
    if (!keywords.trim()) {
      setResolvedKeywordIds("");
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb?action=keyword_search&query=${encodeURIComponent(keywords.trim())}`);
        const data = await res.json();
        const ids = (data.results || []).slice(0, 5).map((k: { id: number }) => k.id).join("|");
        setResolvedKeywordIds(ids);
      } catch {
        setResolvedKeywordIds("");
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [keywords]);

  // Core fetch function
  async function fetchDiscover(startPage: number, append: boolean) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      let genreIds = "";
      if (genreFilter) {
        const id = GENRE_IDS[genreFilter];
        if (id) genreIds = String(id);
      }

      let yearGte = "";
      let yearLte = "";
      if (eraFilter !== "All") {
        const decade = parseInt(eraFilter);
        yearGte = String(decade);
        yearLte = String(decade + 9);
      }

      const sortOrders = ["popularity.desc", "vote_average.desc", "vote_count.desc"];
      const minVotes = [50, 20, 20];
      const ratingMin = ratingFilter !== "Any" ? parseInt(ratingFilter) : 0;
      const minRatings = ratingMin > 0 ? [ratingMin, ratingMin, ratingMin] : [6, 5, 5];
      const fetches = [];

      for (let i = 0; i < 3; i++) {
        const pg = startPage + i;
        const params = new URLSearchParams({
          action: "discover",
          media_type: mediaTab,
          page: String(pg),
          sort_by: sortOrders[i],
          vote_count_gte: String(minVotes[i]),
          vote_avg_gte: String(minRatings[i]),
        });
        if (genreIds) params.set("genre_ids", genreIds);
        if (yearGte) params.set("year_gte", yearGte);
        if (yearLte) params.set("year_lte", yearLte);
        if (resolvedKeywordIds) params.set("with_keywords", resolvedKeywordIds);

        fetches.push(
          fetch(`/api/tmdb?${params.toString()}`).then((r) => r.json()).catch(() => ({ results: [] }))
        );
      }

      if (!genreFilter && eraFilter === "All" && !resolvedKeywordIds) {
        fetches.push(
          fetch(`/api/tmdb?action=trending&media_type=${mediaTab}`).then((r) => r.json()).catch(() => ({ results: [] }))
        );
      }

      const pages = await Promise.all(fetches);
      const allResults: TmdbSearchResult[] = [];
      pages.forEach((p) => {
        if (p.results) allResults.push(...p.results);
      });

      setResults((prev) => {
        const seen = new Set<number>();
        if (append) prev.forEach((r) => seen.add(r.id));

        const newItems = allResults
          .filter((r) => {
            if (seen.has(r.id)) return false;
            if (!r.poster_path) return false;
            if (existingIdsRef.current.has(`${mediaTab}_${r.id}`)) return false;
            if (existingIdsRef.current.has(`watchlist_${mediaTab}_${r.id}`)) return false;
            seen.add(r.id);
            return true;
          })
          .map((r) => ({ ...r, media_type: mediaTab }))
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

        if (newItems.length === 0 && append) {
          hasMoreRef.current = false;
        }

        pageRef.current = startPage + 3;
        return append ? [...prev, ...newItems] : newItems;
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setInitialLoad(false);
      loadingRef.current = false;
    }
  }

  // Reset and fetch fresh on filter/tab change
  // On mobile there's no category stage — always fetch when existingLoaded
  // Track the filter key to avoid re-fetching on remount when cached results exist
  const initialFilterKey = `${mediaTab}|${null}|${"All"}|${sortBy}|${""}|${"Any"}`;
  const filterKeyRef = useRef(results.length > 0 ? initialFilterKey : "");
  const prevMediaTabRef = useRef(mediaTab);
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!existingLoaded) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (flow.stage === "category" && !isMobile) return;

    // Reset filters when media tab changes — done here to avoid double-fetch
    const tabChanged = mediaTab !== prevMediaTabRef.current;
    if (tabChanged) {
      prevMediaTabRef.current = mediaTab;
      setGenreFilter(null);
      setEraFilter("All");
      setRatingFilter("Any");
      setKeywords("");
      setSearchQuery("");
      const filterKey = `${mediaTab}|${null}|${"All"}|${sortBy}|${""}|${"Any"}`;
      filterKeyRef.current = filterKey;
      setResults([]);
      setCurrentPage(1);
      pageRef.current = 1;
      hasMoreRef.current = true;
      loadingRef.current = false;
      setInitialLoad(true);
      fetchDiscover(1, false);
      hasFetchedRef.current = true;
      return;
    }

    const filterKey = `${mediaTab}|${genreFilter}|${eraFilter}|${sortBy}|${resolvedKeywordIds}|${ratingFilter}`;
    // Skip fetch if filter key unchanged and we already have results (from cache or prior fetch)
    if (filterKey === filterKeyRef.current && results.length > 0) return;
    filterKeyRef.current = filterKey;

    // On initial mount with cached results, don't clear them — just fetch fresh in background
    if (!hasFetchedRef.current && results.length > 0) {
      hasFetchedRef.current = true;
      fetchDiscover(1, false);
      return;
    }

    setResults([]);
    setCurrentPage(1);
    pageRef.current = 1;
    hasMoreRef.current = true;
    loadingRef.current = false;
    setInitialLoad(true);
    fetchDiscover(1, false);
    hasFetchedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaTab, genreFilter, eraFilter, sortBy, resolvedKeywordIds, existingLoaded, flow.stage, ratingFilter]);

  // Cache discover results in sessionStorage for instant restore
  useEffect(() => {
    if (results.length > 0) {
      try { sessionStorage.setItem(`discover_${mediaTab}`, JSON.stringify(results.slice(0, 60))); } catch { /* quota */ }
    }
  }, [results, mediaTab]);

  // Search & add to library (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(
          (data.results || [])
            .filter((r: TmdbSearchResult) => r.media_type === "movie" || r.media_type === "tv")
            .slice(0, 6)
        );
      } catch { setSearchResults([]); }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const isInLibrary = useCallback(
    (r: TmdbSearchResult) => existingTmdbIds.has(`${r.media_type}_${r.id}`),
    [existingTmdbIds]
  );

  const isInWatchlist = useCallback(
    (r: TmdbSearchResult) => existingTmdbIds.has(`watchlist_${r.media_type}_${r.id}`),
    [existingTmdbIds]
  );

  async function addToWatchlist(result: TmdbSearchResult) {
    setAddingToWatchlist(result.id);
    try {
      const res = await fetch(`/api/tmdb?action=detail&id=${result.id}&media_type=${result.media_type}`);
      const detail = await res.json();
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const isMovieType = result.media_type === "movie";
      await supabase.from("watchlist").insert({
        user_id: user.id,
        tmdb_id: result.id,
        media_type: result.media_type,
        title: isMovieType ? detail.title : detail.name,
        year: (isMovieType ? detail.release_date : detail.first_air_date)?.substring(0, 4) || null,
        genres: (detail.genres || []).map((g: { name: string }) => g.name),
        poster: detail.poster_path,
        overview: detail.overview,
        tmdb_rating: Math.round((detail.vote_average || 0) * 10) / 10,
        runtime: isMovieType ? detail.runtime : (detail.episode_run_time?.[0] || 0),
        seasons: isMovieType ? 0 : (detail.number_of_seasons || 0),
        episodes: isMovieType ? 0 : (detail.number_of_episodes || 0),
        imdb_id: detail.imdb_id || detail.external_ids?.imdb_id || null,
      });
      setExistingTmdbIds((prev) => {
        const next = new Set(prev);
        next.add(`watchlist_${result.media_type}_${result.id}`);
        return next;
      });
    } catch { /* silently fail */ }
    finally { setAddingToWatchlist(null); }
  }

  function handleAdded(tmdbId: number, mt: string) {
    setExistingTmdbIds((prev) => {
      const next = new Set(prev);
      next.add(`${mt}_${tmdbId}`);
      return next;
    });
    setSelectedResult(null);
  }

  // Flow navigation
  function handleCategorySelect(mediaType: MediaType) {
    setFlow({ stage: "results", mediaType });
    router.push(`/discover?tab=${mediaType}`, { scroll: false });
  }

  function handleBreadcrumbClick(index: number) {
    if (index === 0) {
      setFlow({ stage: "category" });
      router.push("/discover", { scroll: false });
    }
    if (index <= 1) {
      setGenreFilter(null);
      setEraFilter("All");
      setKeywords("");
      setSearchQuery("");
    }
  }

  // Pagination — only count pages that can show a full set of ITEMS_PER_PAGE
  const fullPages = Math.floor(results.length / ITEMS_PER_PAGE);
  const totalPages = Math.max(1, fullPages || 1);
  const pagedResults = results.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function handleNextPage() {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    } else if (hasMoreRef.current && !loadingRef.current) {
      // At the last page of current results — fetch more from TMDB
      fetchDiscover(pageRef.current, true);
      // After fetch completes, results grow and totalPages increases, so advance
      setCurrentPage((p) => p + 1);
    }
  }

  function handlePrevPage() {
    setCurrentPage((p) => Math.max(1, p - 1));
  }

  // Preview bar entry
  const displayResult = peekedResult || results[0] || null;
  const displayEntry = displayResult
    ? {
        id: String(displayResult.id),
        user_id: "",
        tmdb_id: displayResult.id,
        media_type: displayResult.media_type as MediaType,
        title: getDisplayTitle(displayResult),
        year: getYear(displayResult) || null,
        genres: [],
        poster: displayResult.poster_path,
        overview: displayResult.overview,
        tmdb_rating: displayResult.vote_average ? Math.round(displayResult.vote_average * 10) / 10 : null,
        runtime: null,
        seasons: 0,
        episodes: 0,
        imdb_id: null,
        my_rating: displayResult.vote_average || 0,
        tags: [],
        recommended: false,
        rewatch: false,
        seasons_watched: 0,
        season_episode_counts: null,
        year_watched: null,
        added_at: "",
      }
    : null;

  const isMovie = mediaTab === "movie";
  const pageGlows = PAGE_GLOWS["/discover"];
  const themeRgb = isMovie ? pageGlows.movie : pageGlows.tv;
  const rgb = themeRgb.join(",");

  const activeFilterCount = (genreFilter ? 1 : 0) + (ratingFilter !== "Any" ? 1 : 0);

  const breadcrumbPath = flow.stage === "results"
    ? ["Discover", mediaTab === "movie" ? "Movies" : "TV Shows", ...(genreFilter ? [genreFilter] : [])]
    : [];

  // ─── Desktop: TV content based on flow state ───
  const desktopTvContent = (() => {
    switch (flow.stage) {
      case "category":
        return (
          <TvCategorySelect
            area="Discover"
            movieCount={0}
            tvCount={0}
            favCount={0}
            onSelect={handleCategorySelect}
            onBack={() => router.push("/", { scroll: false })}
            onFavourites={() => {}}
            icon={Radar}
            accentColor="text-pink-400"
            accentGlow="drop-shadow(0 0 8px rgba(244,114,182,0.5))"
            glowClass=""
            movieRgb={pageGlows.movie.join(",")}
            tvRgb={pageGlows.tv.join(",")}
          />
        );

      case "results":
        return (
          <div className="flex flex-col h-full relative">
            {/* Single toolbar row */}
            <div className="flex items-center justify-between gap-2 px-2 xl:px-6 py-1.5 xl:py-2 border-b border-border-glow/15">
              {/* Left: Breadcrumb + active filter pills */}
              <div className="flex items-center gap-1 xl:gap-2 min-w-0 shrink-0">
                {breadcrumbPath.map((segment, i) => (
                  <span key={i} className="flex items-center gap-1 min-w-0 shrink-0">
                    {i > 0 && <ChevronDown size={12} className="rotate-[-90deg] text-[#5c5954]/40 shrink-0" />}
                    <button
                      onClick={() => handleBreadcrumbClick(i)}
                      className={`font-display text-[10px] xl:text-[11px] uppercase tracking-wider transition-colors truncate ${
                        i === breadcrumbPath.length - 1
                          ? ""
                          : "text-[#5c5954] hover:text-[#9a968e]"
                      }`}
                      style={i === breadcrumbPath.length - 1 ? { color: `rgb(${rgb})` } : undefined}
                    >
                      {segment}
                    </button>
                  </span>
                ))}

                {/* Active filter pills */}
                {genreFilter && (
                  <button onClick={() => setGenreFilter(null)} className="flex items-center gap-1 px-1.5 xl:px-2 py-0.5 rounded-full text-[8px] xl:text-[9px] font-display uppercase tracking-wider transition-colors shrink-0" style={{ color: `rgb(${rgb})`, backgroundColor: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.2)` }}>
                    {genreFilter} <span className="ml-0.5">×</span>
                  </button>
                )}
              </div>

              {/* Right: Keywords + Search & add + Era + Sort + Filter + count */}
              <div className="flex items-center gap-1 xl:gap-2 min-w-0">
                {/* Keywords input */}
                <div className="relative min-w-0 flex-1 max-w-[100px] xl:max-w-[130px]">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" style={{ color: `rgb(${rgb})` }} />
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Keywords..."
                    className="h-6 xl:h-7 w-full pl-6 pr-2 rounded-lg bg-transparent font-body text-[9px] xl:text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none"
                    style={{ border: `1px solid rgba(${rgb},0.2)` }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb},0.4)`; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb},0.2)`; }}
                  />
                </div>

                {/* Search & add to library */}
                <div className="relative min-w-0 flex-1 max-w-[130px] xl:max-w-[200px]" ref={searchBoxRef}>
                  <Plus size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" style={{ color: `rgb(${rgb})` }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search & add..."
                    className="h-6 xl:h-7 w-full pl-6 pr-2 rounded-lg bg-transparent font-body text-[9px] xl:text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none"
                    style={{ border: `1px solid rgba(${rgb},0.2)` }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb},0.4)`; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb},0.2)`; }}
                  />

                  {/* Search results dropdown — anchored to search input */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border-glow bg-bg-card shadow-xl z-50 overflow-hidden">
                      {searchResults.map((r) => {
                        const inLibrary = isInLibrary(r);
                        return (
                          <div
                            key={`${r.media_type}-${r.id}`}
                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-bg-3 transition-colors"
                          >
                            {r.poster_path && (
                              <img src={posterUrl(r.poster_path, "small")} alt="" className="w-6 h-9 rounded-[2px] object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-display text-[10px] text-[#e8e4dc] truncate">{getDisplayTitle(r)}</p>
                              <p className="font-mono-stats text-[8px] text-[#5c5954]">
                                {getYear(r)} · {r.media_type}
                              </p>
                            </div>
                            <button
                              onClick={() => { if (!inLibrary) setSelectedResult(r); }}
                              disabled={inLibrary}
                              className={`shrink-0 px-2 py-1 rounded text-[8px] font-display uppercase tracking-wider transition-all ${
                                inLibrary
                                  ? "text-green-400/50 border border-green-400/20 cursor-default"
                                  : "text-white border border-transparent hover:bg-white/10"
                              }`}
                              style={!inLibrary ? { backgroundColor: `rgba(${rgb},0.15)`, color: `rgb(${rgb})`, borderColor: `rgba(${rgb},0.25)` } : undefined}
                            >
                              {inLibrary ? "Added" : "+ Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="relative shrink-0" ref={sortDropRef}>
                  <button
                    onClick={() => setSortDropOpen(!sortDropOpen)}
                    className="flex items-center gap-0.5 xl:gap-1 h-6 xl:h-7 px-1.5 xl:px-2.5 rounded-lg bg-bg-deep/40 transition-all hover:bg-bg-deep/70"
                    style={{ border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.3)` }}
                  >
                    <span className="font-display text-[8px] xl:text-[9px] uppercase tracking-wider text-[#5c5954] hidden xl:inline">Sort:</span>
                    <span className="font-display text-[9px] xl:text-[10px] uppercase tracking-wider">{SORT_OPTIONS.find((o) => o.key === sortBy)?.label || "TMDB"}</span>
                    <ChevronDown size={10} className={`${sortDropOpen ? "rotate-180" : ""} transition-transform duration-200 opacity-50`} />
                  </button>
                  {sortDropOpen && (
                    <div className="absolute top-full right-0 mt-1 z-20 min-w-[120px] rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter overflow-hidden">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => { setSortBy(opt.key); setSortDropOpen(false); }}
                          className={`w-full text-left px-3 py-2 font-display text-[10px] uppercase tracking-wider transition-colors ${
                            sortBy === opt.key
                              ? "bg-bg-deep/60"
                              : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"
                          }`}
                          style={sortBy === opt.key ? { color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.4)` } : undefined}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Era dropdown — next to Sort */}
                <div className="relative shrink-0" ref={eraDropRef}>
                  <button
                    onClick={() => setEraDropOpen(!eraDropOpen)}
                    className="flex items-center gap-0.5 xl:gap-1 h-6 xl:h-7 px-1.5 xl:px-2.5 rounded-lg bg-bg-deep/40 transition-all hover:bg-bg-deep/70"
                    style={{ border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.3)` }}
                  >
                    <span className="font-display text-[8px] xl:text-[9px] uppercase tracking-wider text-[#5c5954] hidden xl:inline">Era:</span>
                    <span className="font-display text-[9px] xl:text-[10px] uppercase tracking-wider">{eraFilter === "All" ? "All" : eraFilter}</span>
                    <ChevronDown size={10} className={`${eraDropOpen ? "rotate-180" : ""} transition-transform duration-200 opacity-50`} />
                  </button>
                  {eraDropOpen && (
                    <div className="absolute top-full right-0 mt-1 z-20 min-w-[120px] rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter overflow-hidden">
                      {ERAS.map((era) => (
                        <button
                          key={era}
                          onClick={() => { setEraFilter(era); setEraDropOpen(false); }}
                          className={`w-full text-left px-3 py-2 font-display text-[10px] uppercase tracking-wider transition-colors ${
                            eraFilter === era
                              ? "bg-bg-deep/60"
                              : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"
                          }`}
                          style={eraFilter === era ? { color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.4)` } : undefined}
                        >
                          {era === "All" ? "All Eras" : era}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rating dropdown */}
                <div className="relative shrink-0" ref={ratingDropRef}>
                  <button
                    onClick={() => setRatingDropOpen(!ratingDropOpen)}
                    className="flex items-center gap-0.5 xl:gap-1 h-6 xl:h-7 px-1.5 xl:px-2.5 rounded-lg bg-bg-deep/40 transition-all hover:bg-bg-deep/70"
                    style={{ border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.3)` }}
                  >
                    <span className="font-display text-[8px] xl:text-[9px] uppercase tracking-wider text-[#5c5954] hidden xl:inline">Rating:</span>
                    <span className="font-display text-[9px] xl:text-[10px] uppercase tracking-wider">{ratingFilter === "Any" ? "Any" : `${ratingFilter}+`}</span>
                    <ChevronDown size={10} className={`${ratingDropOpen ? "rotate-180" : ""} transition-transform duration-200 opacity-50`} />
                  </button>
                  {ratingDropOpen && (
                    <div className="absolute top-full right-0 mt-1 z-20 min-w-[100px] rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter overflow-hidden">
                      {["Any", "6", "7", "8", "9"].map((r) => (
                        <button
                          key={r}
                          onClick={() => { setRatingFilter(r); setRatingDropOpen(false); }}
                          className={`w-full text-left px-3 py-2 font-display text-[10px] uppercase tracking-wider transition-colors ${
                            ratingFilter === r
                              ? "bg-bg-deep/60"
                              : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"
                          }`}
                          style={ratingFilter === r ? { color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.4)` } : undefined}
                        >
                          {r === "Any" ? "Any" : `${r}+`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filter button */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className="flex items-center gap-0.5 xl:gap-1 h-6 xl:h-7 px-1.5 xl:px-2.5 rounded-lg border border-border-glow/20 text-[#5c5954] transition-colors shrink-0"
                  onMouseEnter={(e) => { e.currentTarget.style.color = `rgb(${rgb})`; e.currentTarget.style.borderColor = `rgba(${rgb},0.4)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = ""; e.currentTarget.style.borderColor = ""; }}
                >
                  <SlidersHorizontal size={11} />
                  <span className="font-display text-[9px] xl:text-[10px] uppercase tracking-wider hidden xl:inline">Filter</span>
                  <span
                    className={`w-3.5 h-3.5 xl:w-4 xl:h-4 rounded-full flex items-center justify-center text-[7px] xl:text-[8px] font-mono-stats transition-opacity ${activeFilterCount > 0 ? "opacity-100" : "opacity-0"}`}
                    style={{ backgroundColor: `rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}
                  >
                    {activeFilterCount || 0}
                  </span>
                </button>

                <span className="font-mono-stats text-[9px] text-[#5c5954] shrink-0">{results.length}</span>
              </div>
            </div>

            {/* Paginated poster grid — 7-col with arrows, no page indicator */}
            {initialLoad ? (
              <div className="flex items-center justify-center flex-1">
                <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${rgb},0.3)`, borderTopColor: `rgb(${rgb})` }} />
              </div>
            ) : pagedResults.length > 0 ? (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-1 py-2">
                <div className="flex items-center w-full flex-1 min-h-0">
                  {/* Left arrow */}
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="shrink-0 w-10 h-full flex items-center justify-center disabled:opacity-10 disabled:cursor-not-allowed transition-all group"
                    style={{ color: `rgb(${rgb})` }}
                  >
                    <ChevronDown
                      size={44}
                      className="rotate-90 transition-all duration-300 group-hover:scale-125"
                      style={{
                        filter: currentPage === 1 ? "none" : `drop-shadow(0 0 8px rgba(${rgb},0.6)) drop-shadow(0 0 20px rgba(${rgb},0.3))`,
                      }}
                    />
                  </button>

                  <div className="poster-grid grid grid-cols-7 gap-1.5 flex-1 min-h-0">
                    {pagedResults.map((r, i) => {
                      const inLibrary = isInLibrary(r);
                      const inWatchlist = isInWatchlist(r);
                      return (
                        <div
                          key={`${r.media_type}-${r.id}`}
                          className={`poster-card group relative overflow-hidden bg-bg-deep cursor-pointer animate-slide-in rounded-md ${
                            inLibrary ? "opacity-40" : ""
                          }`}
                          style={{ animationDelay: `${Math.min(i * 20, 250)}ms`, border: "1px solid rgba(255,255,255,0.05)" }}
                          onMouseEnter={() => setPeekedResult(r)}
                          onClick={() => { if (!inLibrary) setSelectedResult(r); }}
                        >
                          <div className="aspect-[2/3]">
                            <img
                              src={posterUrl(r.poster_path, "medium")}
                              alt={getDisplayTitle(r)}
                              className="w-full h-full object-cover rounded-md"
                              loading="lazy"
                            />
                          </div>

                          {/* Rating badge */}
                          {r.vote_average > 0 && (
                            <div
                              className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-white text-[8px] font-mono-stats font-bold shadow-lg"
                              style={{ backgroundColor: `rgba(${rgb},0.9)` }}
                            >
                              {r.vote_average.toFixed(1)}
                            </div>
                          )}

                          {/* Desktop: hover overlay with actions */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                            <p className="font-display text-[9px] text-white leading-tight truncate">{getDisplayTitle(r)}</p>
                            <p className="font-mono-stats text-[7px] text-[#9a968e] mb-1.5">{getYear(r)}</p>
                            <div className="flex gap-1">
                              {!inLibrary ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedResult(r); }}
                                  className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded text-[7px] font-display uppercase tracking-wider text-white transition-colors"
                                  style={{ backgroundColor: `rgba(${rgb},0.8)` }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `rgb(${rgb})`; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `rgba(${rgb},0.8)`; }}
                                >
                                  <Plus size={8} /> Add
                                </button>
                              ) : (
                                <span className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded text-[7px] font-display uppercase tracking-wider text-green-400/70">
                                  <Check size={8} /> Added
                                </span>
                              )}
                              {!inLibrary && !inWatchlist && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); addToWatchlist(r); }}
                                  disabled={addingToWatchlist === r.id}
                                  className="p-1 rounded border border-border-glow/50 transition-all disabled:opacity-50"
                                  style={{ color: `rgb(${rgb})` }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb},0.4)`; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; }}
                                >
                                  <Bookmark size={8} />
                                </button>
                              )}
                              {inWatchlist && (
                                <span className="p-1 rounded" style={{ color: `rgba(${rgb},0.5)` }}>
                                  <Bookmark size={8} className="fill-current" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right arrow — loads more when at the edge */}
                  <button
                    onClick={handleNextPage}
                    disabled={!hasMoreRef.current && currentPage >= totalPages}
                    className="shrink-0 w-10 h-full flex items-center justify-center disabled:opacity-10 disabled:cursor-not-allowed transition-all group"
                    style={{ color: `rgb(${rgb})` }}
                  >
                    <ChevronDown
                      size={44}
                      className="-rotate-90 transition-all duration-300 group-hover:scale-125"
                      style={{
                        filter: (!hasMoreRef.current && currentPage >= totalPages) ? "none" : `drop-shadow(0 0 8px rgba(${rgb},0.6)) drop-shadow(0 0 20px rgba(${rgb},0.3))`,
                      }}
                    />
                  </button>
                </div>

                {/* Loading indicator when fetching more */}
                {loading && (
                  <div className="flex items-center justify-center py-1">
                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${rgb},0.3)`, borderTopColor: `rgb(${rgb})` }} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Radar size={28} className="text-[#5c5954]/20 mx-auto mb-3" />
                  <p className="font-body text-sm text-[#5c5954]">
                    No results found. Try different filters.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
    }
  })();

  return (
    <div className="px-4 pt-1 pb-0 flex flex-col flex-1 min-h-0 overflow-hidden lg:px-5 lg:pt-3 lg:pb-0 lg:overflow-hidden">

      {/* ═══ MOBILE LAYOUT ═══ */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        {/* Hero banner */}
        {heroResult && (
          <div
            className="relative mb-2 cursor-pointer animate-fade-up flex-shrink-0"
            onClick={() => setSelectedResult(heroResult)}
          >
            <div
              className="absolute inset-0 -mx-4"
              style={{
                backgroundImage: `url(${posterUrl(heroResult.poster_path, "large")})`,
                backgroundSize: "cover",
                backgroundPosition: "center 20%",
                filter: "brightness(0.15) saturate(1.4) blur(40px)",
                transform: "scale(1.1)",
                maskImage: "linear-gradient(to bottom, black 30%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 100%)",
              }}
            />
            <div className="relative z-[1] flex items-center gap-4 py-2.5">
              <img
                src={posterUrl(heroResult.poster_path, "small")}
                alt={getDisplayTitle(heroResult)}
                className="w-[60px] h-[90px] rounded-[8px] object-cover shadow-[0_6px_30px_rgba(0,0,0,0.5)] flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[8px] uppercase tracking-[2px] font-semibold mb-0.5 text-pink-400">
                  Discover
                </p>
                <h2 className="font-display text-base font-medium text-[#e8e4dc] tracking-wide mb-0.5 truncate">
                  {getDisplayTitle(heroResult)}
                </h2>
                <div className="flex items-center gap-2">
                  {heroResult.vote_average > 0 && (
                    <span className="font-mono-stats text-sm text-pink-400 font-bold">
                      {heroResult.vote_average.toFixed(1)}
                    </span>
                  )}
                  <span className="font-mono-stats text-xs text-[#5c5954]">
                    {getYear(heroResult)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Movies/TV tabs */}
        <div className="flex justify-center mb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <a
              href="/discover?tab=movie"
              className={`px-6 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${
                isMovie ? "text-white" : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
              style={isMovie ? { background: `linear-gradient(135deg, rgb(${pageGlows.movie.join(",")}), rgba(${pageGlows.movie.join(",")},0.7))` } : undefined}
            >
              Movies
            </a>
            <a
              href="/discover?tab=tv"
              className={`px-6 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${
                !isMovie ? "text-white" : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
              style={!isMovie ? { background: `linear-gradient(135deg, rgb(${pageGlows.tv.join(",")}), rgba(${pageGlows.tv.join(",")},0.7))` } : undefined}
            >
              TV Shows
            </a>
          </div>
        </div>

        {/* Mobile: filter dropdowns */}
        <div className="space-y-1.5 mb-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MobileDropdown
              value={genreFilter || ""}
              options={[{ key: "", label: "All Genres" }, ...MAJOR_GENRES.map((g) => ({ key: g, label: g }))]}
              onChange={(v) => setGenreFilter(v || null)}
              className="flex-1"
              rgb={rgb}
            />
            <MobileDropdown
              value={eraFilter}
              options={ERAS.map((e) => ({ key: e, label: e }))}
              onChange={(v) => setEraFilter(v)}
              className="flex-1"
              rgb={rgb}
            />
            <MobileDropdown
              value={ratingFilter}
              options={[{ key: "Any", label: "Any" }, { key: "6", label: "6+" }, { key: "7", label: "7+" }, { key: "8", label: "8+" }, { key: "9", label: "9+" }]}
              onChange={(v) => setRatingFilter(v)}
              className="flex-1"
              rgb={rgb}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-[8px] uppercase tracking-wider text-[#5c5954] shrink-0">Sort by:</span>
            <MobileDropdown
              value={sortBy}
              options={SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              onChange={(v) => setSortBy(v as SortKey)}
              rgb={rgb}
            />
            <div className="relative flex-1">
              <Plus size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: `rgba(${rgb},0.5)` }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search & add to library..."
                className="w-full h-7 rounded-lg pl-7 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none"
                style={{ border: `1px solid rgba(${rgb},0.2)`, backgroundColor: "#0e0e14" }}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-xl z-50 overflow-hidden max-h-[200px] overflow-y-auto">
                  {searchResults.map((r) => {
                    const inLib = isInLibrary(r);
                    return (
                      <div key={`${r.media_type}-${r.id}`} className="flex items-center gap-2 w-full px-3 py-2 active:bg-bg-3 transition-colors">
                        {r.poster_path && <img src={posterUrl(r.poster_path, "small")} alt="" className="w-5 h-8 rounded-[2px] object-cover shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-[9px] text-[#e8e4dc] truncate">{getDisplayTitle(r)}</p>
                          <p className="font-mono-stats text-[7px] text-[#5c5954]">{getYear(r)} · {r.media_type}</p>
                        </div>
                        <button
                          onClick={() => { if (!inLib) setSelectedResult(r); }}
                          disabled={inLib}
                          className="shrink-0 px-2 py-0.5 rounded text-[7px] font-display uppercase tracking-wider"
                          style={inLib ? { color: "rgba(74,222,128,0.5)" } : { color: `rgb(${rgb})`, backgroundColor: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.25)` }}
                        >
                          {inLib ? "Added" : "+ Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile grid — scrollable */}
        {results.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto pb-20">
            <div className="poster-grid grid grid-cols-3 sm:grid-cols-4 gap-0.5">
              {results.map((r, i) => {
                const inLibrary = isInLibrary(r);
                const inWatchlist = isInWatchlist(r);
                return (
                  <div
                    key={`${r.media_type}-${r.id}`}
                    className={`poster-card group relative overflow-hidden bg-bg-deep cursor-pointer animate-slide-in ${
                      inLibrary ? "opacity-40" : ""
                    }`}
                    style={{ animationDelay: `${Math.min(i * 30, 400)}ms`, border: "1px solid rgba(255,255,255,0.05)" }}
                    onClick={() => { if (!inLibrary) setSelectedResult(r); }}
                  >
                    <div className="aspect-[2/3]">
                      <img
                        src={posterUrl(r.poster_path, "small")}
                        alt={getDisplayTitle(r)}
                        className="w-full h-full object-cover rounded-[6px]"
                        loading="lazy"
                      />
                    </div>

                    {r.vote_average > 0 && (
                      <div
                        className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-white text-[8px] font-mono-stats font-bold shadow-lg"
                        style={{ backgroundColor: `rgba(${rgb},0.9)` }}
                      >
                        {r.vote_average.toFixed(1)}
                      </div>
                    )}

                    {/* Mobile: always-visible bottom bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-4 pb-1 px-1">
                      <div className="flex gap-0.5">
                        {!inLibrary ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedResult(r); }}
                            className="flex-1 flex items-center justify-center gap-0.5 py-0.5 rounded text-[6px] font-display uppercase tracking-wider text-white"
                            style={{ backgroundColor: `rgba(${rgb},0.8)` }}
                          >
                            <Plus size={7} /> Add
                          </button>
                        ) : (
                          <span className="flex-1 flex items-center justify-center gap-0.5 py-0.5 rounded text-[6px] font-display uppercase text-green-400/70">
                            <Check size={7} />
                          </span>
                        )}
                        {!inLibrary && !inWatchlist && (
                          <button
                            onClick={(e) => { e.stopPropagation(); addToWatchlist(r); }}
                            disabled={addingToWatchlist === r.id}
                            className="px-1 py-0.5 rounded text-[#9a968e] border border-border-glow/50 disabled:opacity-50"
                          >
                            <Bookmark size={7} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${rgb},0.3)`, borderTopColor: `rgb(${rgb})` }} />
              </div>
            )}
          </div>
        ) : initialLoad ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${rgb},0.3)`, borderTopColor: `rgb(${rgb})` }} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1">
            <Radar size={36} className="text-[#5c5954]/20 mb-4" />
            <p className="font-body text-[#5c5954] text-center">
              No results found. Try different filters.
            </p>
          </div>
        )}
      </div>

      {/* ═══ DESKTOP LAYOUT ═══ */}
      <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 relative">
        <LedBars />
        <TvFrame isOn={tvOn} onPowerToggle={() => setTvOn(!tvOn)}>
          {desktopTvContent}
        </TvFrame>
        <div className="hidden lg:block px-32">
          <div className="tv-stand">
            <div className="tv-stand-neck" />
            <div className="tv-stand-base" />
          </div>
        </div>
        <PreviewBar
          entry={flow.stage === "results" ? displayEntry : null}
          onEdit={() => {}}
          isOn={tvOn}
        />
      </div>

      {/* Discover Filter Drawer — genre only */}
      <DiscoverFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        genreFilter={genreFilter}
        setGenreFilter={setGenreFilter}
        accentRgb={rgb}
      />

      {/* Add modal */}
      {selectedResult && (
        <AddModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          onAdded={handleAdded}
          onAddToWatchlist={addToWatchlist}
          isInWatchlist={isInWatchlist(selectedResult)}
        />
      )}
    </div>
  );
}

/* ── Discover Filter Drawer — genre only (era & keywords live outside) ── */

function DiscoverFilterDrawer({
  open,
  onClose,
  genreFilter,
  setGenreFilter,
  accentRgb,
}: {
  open: boolean;
  onClose: () => void;
  genreFilter: string | null;
  setGenreFilter: (g: string | null) => void;
  accentRgb: string;
}) {
  if (!open) return null;

  const rgb = accentRgb;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl bg-[#0e0e14] border border-border-glow/30 shadow-2xl animate-drawer-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border-glow/20 bg-[#0e0e14]">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm uppercase tracking-wider text-[#e8e4dc]">Genre</h3>
            {genreFilter && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-mono-stats"
                style={{ backgroundColor: `rgba(${rgb},0.15)`, color: `rgb(${rgb})` }}
              >
                1
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#5c5954] hover:text-[#e8e4dc] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setGenreFilter(null)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider border transition-all ${
                !genreFilter
                  ? "border-transparent"
                  : "text-[#5c5954] border-border-glow/30 hover:text-[#9a968e]"
              }`}
              style={!genreFilter ? { color: `rgb(${rgb})`, borderColor: `rgba(${rgb},0.3)`, backgroundColor: `rgba(${rgb},0.1)` } : undefined}
            >
              All
            </button>
            {MAJOR_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider border transition-all ${
                  genreFilter === g
                    ? "border-transparent"
                    : "text-[#5c5954] border-border-glow/30 hover:text-[#9a968e]"
                }`}
                style={genreFilter === g ? { color: `rgb(${rgb})`, borderColor: `rgba(${rgb},0.3)`, backgroundColor: `rgba(${rgb},0.1)` } : undefined}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between p-4 border-t border-border-glow/20 bg-[#0e0e14]">
          <button
            onClick={() => setGenreFilter(null)}
            className="font-display text-[10px] uppercase tracking-wider text-[#5c5954] hover:text-[#9a968e] transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-display text-[11px] uppercase tracking-wider text-white hover:shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, rgb(${rgb}), rgba(${rgb},0.7))` }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
