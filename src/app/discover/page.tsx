"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Radar, Search, Plus, Bookmark, Check, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
import { AddModal } from "@/components/add-modal";

const SORT_OPTIONS = [
  { key: "vote_average.desc", label: "TMDB" },
  { key: "popularity.desc", label: "Popular" },
  { key: "primary_release_date.desc", label: "Year" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverContent />
    </Suspense>
  );
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const mediaTab = (searchParams.get("tab") || "movie") as MediaType;

  // Filters
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortKey>("vote_average.desc");
  const [keywords, setKeywords] = useState("");

  // Results
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Guards via refs — never stale, no closure issues
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);

  // Search & add to library
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);

  // Existing IDs — ref always has the latest value for use inside fetchDiscover
  const [existingTmdbIds, setExistingTmdbIds] = useState<Set<string>>(new Set());
  const existingIdsRef = useRef(existingTmdbIds);
  existingIdsRef.current = existingTmdbIds;
  const [addingToWatchlist, setAddingToWatchlist] = useState<number | null>(null);
  const [selectedResult, setSelectedResult] = useState<TmdbSearchResult | null>(null);

  // TV frame
  const [tvOn, setTvOn] = useState(true);
  const [peekedResult, setPeekedResult] = useState<TmdbSearchResult | null>(null);

  // Scroll container ref — directly on the .tv-scroll element via TvFrame prop
  const tvScrollRef = useRef<HTMLDivElement>(null);
  // Mobile scroll container
  const mobileScrollRef = useRef<HTMLDivElement>(null);

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

  const pillClass = (active: boolean) =>
    `px-[10px] py-[4px] rounded-[20px] text-[11px] xl:px-[14px] xl:py-[6px] xl:text-[13px] tracking-[0.3px] border cursor-pointer transition-all whitespace-nowrap ${
      active
        ? "text-vr-blue border-vr-blue/30 bg-[rgba(14,165,233,0.12)]"
        : "text-[#9a968e] border-border-glow bg-[rgba(12,12,16,0.85)] hover:text-[#e8e4dc]"
    }`;

  // Load existing entries + watchlist, then trigger initial discover
  const [existingLoaded, setExistingLoaded] = useState(false);
  useEffect(() => {
    async function loadExisting() {
      const supabase = createClient();
      const { data: entries } = await supabase.from("entries").select("tmdb_id, media_type");
      const { data: watchlist } = await supabase.from("watchlist").select("tmdb_id, media_type");
      const ids = new Set<string>();
      entries?.forEach((e) => ids.add(`${e.media_type}_${e.tmdb_id}`));
      watchlist?.forEach((w) => ids.add(`watchlist_${w.media_type}_${w.tmdb_id}`));
      setExistingTmdbIds(ids);
      existingIdsRef.current = ids;
      setExistingLoaded(true);
    }
    loadExisting();
  }, []);

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

  // Core fetch function — uses refs for page/loading guards, never stale
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

      // Fetch 3 pages with different sort orders (matches original HTML)
      const sortOrders = ["popularity.desc", "vote_average.desc", "vote_count.desc"];
      const minVotes = [50, 20, 20];
      const minRatings = [6, 5, 5];
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

      // Also fetch trending if no filters active
      if (!genreFilter && eraFilter === "All" && !resolvedKeywordIds) {
        fetches.push(
          fetch(`/api/tmdb?action=trending&media_type=${mediaTab}`).then((r) => r.json()).catch(() => ({ results: [] }))
        );
      }

      const pages = await Promise.all(fetches);

      // Collect all raw results
      const allResults: TmdbSearchResult[] = [];
      pages.forEach((p) => {
        if (p.results) allResults.push(...p.results);
      });

      // Deduplicate and filter — use state updater for latest prev
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

        // Advance page ref for next scroll trigger
        pageRef.current = startPage + 3;

        return append ? [...prev, ...newItems] : newItems;
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setInitialLoad(false);
      loadingRef.current = false;

      // Auto-fill: if content doesn't fill the scroll container, load more
      // (same behaviour as original — observer fires immediately when sentinel is visible)
      requestAnimationFrame(() => {
        const el = tvScrollRef.current || mobileScrollRef.current;
        if (el && hasMoreRef.current && !loadingRef.current) {
          if (el.scrollHeight <= el.clientHeight + 50) {
            fetchDiscover(pageRef.current, true);
          }
        }
      });
    }
  }

  // Reset and fetch fresh on filter/tab change (waits for existing IDs to load first)
  useEffect(() => {
    if (!existingLoaded) return;
    setResults([]);
    pageRef.current = 1;
    hasMoreRef.current = true;
    loadingRef.current = false;
    setInitialLoad(true);
    fetchDiscover(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaTab, genreFilter, eraFilter, sortBy, resolvedKeywordIds, existingLoaded]);

  // Infinite scroll via scroll event listener on the actual scroll containers.
  // Re-attaches when initialLoad flips to false (TV frame is now in the DOM)
  // and when filters change (fetchDiscover closure captures filter values).
  useEffect(() => {
    function handleScroll(e: Event) {
      const el = e.currentTarget as HTMLElement;
      if (loadingRef.current || !hasMoreRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        fetchDiscover(pageRef.current, true);
      }
    }

    const tvEl = tvScrollRef.current;
    const mobileEl = mobileScrollRef.current;

    tvEl?.addEventListener("scroll", handleScroll, { passive: true });
    mobileEl?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      tvEl?.removeEventListener("scroll", handleScroll);
      mobileEl?.removeEventListener("scroll", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaTab, genreFilter, eraFilter, sortBy, resolvedKeywordIds, existingTmdbIds, initialLoad]);

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

  // Poster grid with hover actions
  const discoverGrid = (
    <div>
      <div className="poster-grid grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-0">
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
              onMouseEnter={() => setPeekedResult(r)}
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

              {/* Rating badge */}
              {r.vote_average > 0 && (
                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-white text-[8px] font-mono-stats font-bold shadow-lg ${
                  isMovie ? "bg-vr-blue/90" : "bg-vr-violet/90"
                }`}>
                  {r.vote_average.toFixed(1)}
                </div>
              )}

              {/* Mobile: always-visible bottom bar with add/watchlist */}
              <div className="absolute bottom-0 left-0 right-0 md:hidden bg-gradient-to-t from-black/90 to-transparent pt-4 pb-1 px-1">
                <div className="flex gap-0.5">
                  {!inLibrary ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedResult(r); }}
                      className="flex-1 flex items-center justify-center gap-0.5 py-0.5 rounded text-[6px] font-display uppercase tracking-wider text-white bg-vr-blue/80"
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

              {/* Desktop: hover overlay with actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex flex-col justify-end p-1.5">
                <p className="font-display text-[9px] text-white leading-tight truncate">{getDisplayTitle(r)}</p>
                <p className="font-mono-stats text-[7px] text-[#9a968e] mb-1.5">{getYear(r)}</p>
                <div className="flex gap-1">
                  {!inLibrary ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedResult(r); }}
                      className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded text-[7px] font-display uppercase tracking-wider text-white bg-vr-blue/80 hover:bg-vr-blue transition-colors"
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
                      className="p-1 rounded text-[#9a968e] hover:text-vr-violet border border-border-glow/50 hover:border-vr-violet/30 transition-all disabled:opacity-50"
                    >
                      <Bookmark size={8} />
                    </button>
                  )}
                  {inWatchlist && (
                    <span className="p-1 rounded text-vr-violet/50">
                      <Bookmark size={8} className="fill-current" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading more spinner */}
      {loading && results.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
        </div>
      )}
    </div>
  );

  return (
    <div className="px-4 pt-1 pb-0 flex flex-col flex-1 min-h-0 overflow-hidden lg:px-5 lg:pt-3 lg:pb-0 lg:overflow-hidden">
      {/* Hero banner — mobile only */}
      {heroResult && (
        <div
          className="relative mb-2 cursor-pointer animate-fade-up flex-shrink-0 lg:hidden"
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

      {/* Mobile: filter dropdowns */}
      <div className="lg:hidden mb-1 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="relative flex-1">
            <select
              value={genreFilter || ""}
              onChange={(e) => setGenreFilter(e.target.value || null)}
              className="appearance-none w-full h-7 pl-3 pr-7 rounded-[20px] border border-border-glow bg-bg-3 font-display text-[10px] uppercase tracking-wider text-[#e8e4dc] focus:outline-none focus:border-vr-blue/30 cursor-pointer"
            >
              <option value="">All Genres</option>
              {MAJOR_GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5c5954] pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <select
              value={eraFilter}
              onChange={(e) => setEraFilter(e.target.value)}
              className="appearance-none w-full h-7 pl-3 pr-7 rounded-[20px] border border-border-glow bg-bg-3 font-display text-[10px] uppercase tracking-wider text-[#e8e4dc] focus:outline-none focus:border-vr-blue/30 cursor-pointer"
            >
              {ERAS.map((era) => (
                <option key={era} value={era}>{era}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5c5954] pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="appearance-none h-7 pl-3 pr-7 rounded-[20px] border border-border-glow bg-bg-3 font-display text-[10px] uppercase tracking-wider text-[#e8e4dc] focus:outline-none focus:border-vr-blue/30 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5c5954] pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5954]" />
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Keywords..."
              className="w-full h-7 rounded-[20px] border border-border-glow bg-[rgba(12,12,16,0.85)] pl-8 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/30"
            />
          </div>
        </div>
      </div>

      {/* Desktop: filter rows — aligned with TV width */}
      <div className="hidden lg:block space-y-1 mb-2 flex-shrink-0 px-32 relative z-10">
        {/* Row 1: Genre + Sort + Era */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-display text-[9px] uppercase tracking-[0.15em] text-vr-blue shrink-0">Genre</span>
          <button onClick={() => setGenreFilter(null)} className={pillClass(!genreFilter)}>All</button>
          {MAJOR_GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenreFilter(genreFilter === g ? null : g)}
              className={pillClass(genreFilter === g)}
            >
              {g}
            </button>
          ))}
          <span className="font-display text-[9px] uppercase tracking-[0.15em] text-vr-violet shrink-0 ml-2">Sort</span>
          {SORT_OPTIONS.map((opt) => (
            <button key={opt.key} onClick={() => setSortBy(opt.key)} className={pillClass(sortBy === opt.key)}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Row 2: Era + Keywords + Discover button + Search & add */}
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[9px] uppercase tracking-[0.15em] text-vr-blue shrink-0">Era</span>
          {ERAS.map((era) => (
            <button key={era} onClick={() => setEraFilter(era)} className={pillClass(eraFilter === era)}>
              {era}
            </button>
          ))}

          {/* Keywords */}
          <div className="relative flex-1 min-w-[120px] ml-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5954]" />
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Keywords (korean, heist...)"
              className="w-full h-7 rounded-[20px] border border-border-glow bg-[rgba(12,12,16,0.85)] pl-8 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/30"
            />
          </div>

          {/* Discover button */}
          <button
            onClick={() => {
              setResults([]);
              pageRef.current = 1;
              hasMoreRef.current = true;
              loadingRef.current = false;
              fetchDiscover(1, false);
            }}
            disabled={loading && results.length === 0}
            className="px-4 py-1 rounded-[20px] text-[10px] font-display uppercase tracking-wider text-white transition-all hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] disabled:opacity-50 shrink-0"
            style={{ background: `linear-gradient(135deg, ${isMovie ? "#0ea5e9, #0284c7" : "#8b5cf6, #7c3aed"})` }}
          >
            Discover
          </button>

          {/* Search & add to library */}
          <div className="relative flex-1 min-w-[140px]">
            <Plus size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-vr-violet" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search & add to library..."
              className="w-full h-7 rounded-[20px] border border-vr-violet/20 bg-[rgba(12,12,16,0.85)] pl-8 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-violet/40"
            />
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
                            : "bg-vr-violet/15 text-vr-violet border border-vr-violet/25 hover:bg-vr-violet/25"
                        }`}
                      >
                        {inLibrary ? "Added" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <span className="font-mono-stats text-[9px] text-[#5c5954] shrink-0">{results.length} titles</span>
        </div>
      </div>

      {/* Content — TV frame on desktop */}
      {(results.length > 0 || loading) ? (
        <>
          <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 relative">
            <LedBars />

            <TvFrame isOn={tvOn} onPowerToggle={() => setTvOn(!tvOn)} scrollRef={tvScrollRef}>
              {initialLoad ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
                </div>
              ) : (
                discoverGrid
              )}
            </TvFrame>
            <div className="hidden lg:block px-32">
              <div className="tv-stand">
                <div className="tv-stand-neck" />
                <div className="tv-stand-base" />
              </div>
            </div>
            <PreviewBar
              entry={displayEntry}
              onEdit={() => {}}
              isOn={tvOn}
            />
          </div>
          {/* Mobile: plain grid — scrollable, hero+filters stay pinned above */}
          <div ref={mobileScrollRef} className="lg:hidden flex-1 min-h-0 overflow-y-auto pb-20">
            {initialLoad ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
              </div>
            ) : (
              discoverGrid
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1">
          <Radar size={36} className="text-neon-cyan/20 mb-4" />
          <p className="font-body text-[#5c5954] text-center">
            Set your filters and hit Discover to find something new.
          </p>
        </div>
      )}

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
