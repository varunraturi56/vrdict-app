"use client";

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Bookmark, Search, ChevronDown, X, Plus, Star, RotateCcw, SlidersHorizontal } from "lucide-react";
import { MobileDropdown } from "@/components/ui/mobile-dropdown";
import { createClient } from "@/lib/supabase/client";
import { posterUrl, normalizeGenres } from "@/lib/tmdb";
import { MAJOR_GENRES, type WatchlistItem, type Entry, type MediaType } from "@/lib/types";
import { TvFrame } from "@/components/ui/tv-frame";
import { LedBars } from "@/components/ui/led-bar";
import { PreviewBar } from "@/components/ui/preview-bar";
import { TvCategorySelect } from "@/components/ui/tv-category-select";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { PAGE_GLOWS } from "@/lib/ambient-colors";

const SORT_OPTIONS = [
  { key: "tmdb_rating", label: "TMDB" },
  { key: "title", label: "Title" },
  { key: "year", label: "Year" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

const RATING_FILTERS = [
  { key: "any", label: "Any", min: 0 },
  { key: "6+", label: "6+", min: 6 },
  { key: "7+", label: "7+", min: 7 },
  { key: "8+", label: "8+", min: 8 },
  { key: "9+", label: "9+", min: 9 },
] as const;

type RatingKey = (typeof RATING_FILTERS)[number]["key"];

type FlowState =
  | { stage: "category" }
  | { stage: "results"; mediaType: MediaType };

const ITEMS_PER_PAGE = 16; // 4×4 info-card grid

export default function WatchlistPage() {
  return (
    <Suspense>
      <WatchlistContent />
    </Suspense>
  );
}

function WatchlistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mediaTab = (searchParams.get("tab") || "movie") as MediaType;

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("tmdb_rating");
  const [ratingFilter, setRatingFilter] = useState<RatingKey>("any");
  const [searchQuery, setSearchQuery] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const [addResults, setAddResults] = useState<any[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [heroEntry, setHeroEntry] = useState<WatchlistItem | null>(null);
  const [tvOn, setTvOn] = useState(true);
  const [peekedEntry, setPeekedEntry] = useState<WatchlistItem | null>(null);
  const [movingToLibrary, setMovingToLibrary] = useState<string | null>(null);
  const [showRewatch, setShowRewatch] = useState(false);
  const [rewatchItems, setRewatchItems] = useState<Entry[]>([]);
  const [rewatchLoading, setRewatchLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Desktop flow state
  const hasTab = searchParams.get("tab");
  const [flow, setFlow] = useState<FlowState>(
    hasTab
      ? { stage: "results", mediaType: (hasTab || "movie") as MediaType }
      : { stage: "category" }
  );

  // Sync flow with URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setFlow({ stage: "results", mediaType: tab as MediaType });
    } else {
      setFlow({ stage: "category" });
    }
  }, [searchParams]);

  // Fetch rewatch entries from library
  useEffect(() => {
    if (!showRewatch) return;
    async function loadRewatch() {
      setRewatchLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("entries")
        .select("*")
        .eq("rewatch", true)
        .order("my_rating", { ascending: false });
      if (data) setRewatchItems(data as Entry[]);
      setRewatchLoading(false);
    }
    loadRewatch();
  }, [showRewatch]);

  // Fetch watchlist
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("watchlist")
        .select("*")
        .order("added_at", { ascending: false });
      if (data) setItems(data as WatchlistItem[]);
      setLoading(false);
    }
    load();
  }, []);

  // Reset filters on tab switch
  useEffect(() => {
    setGenreFilter(null);
    setSearchQuery("");
    setCurrentPage(1);
  }, [mediaTab]);

  const activeMediaType = flow.stage === "results" ? flow.mediaType : mediaTab;

  const mediaItems = useMemo(
    () => items.filter((e) => e.media_type === activeMediaType),
    [items, activeMediaType]
  );

  const movieCount = items.filter((e) => e.media_type === "movie").length;
  const tvCount = items.filter((e) => e.media_type === "tv").length;

  const minRating = RATING_FILTERS.find((r) => r.key === ratingFilter)?.min || 0;

  const filteredItems = useMemo(() => {
    let result = mediaItems;
    if (genreFilter) result = result.filter((e) => e.genres?.includes(genreFilter));
    if (minRating > 0) result = result.filter((e) => (e.tmdb_rating || 0) >= minRating);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "tmdb_rating": return (b.tmdb_rating || 0) - (a.tmdb_rating || 0);
        case "title": return a.title.localeCompare(b.title);
        case "year": return (b.year || "").localeCompare(a.year || "");
        default: return 0;
      }
    });
  }, [mediaItems, genreFilter, minRating, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const pagedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [genreFilter, ratingFilter, searchQuery, sortBy]);

  // Rewatch items filtered by current tab
  const filteredRewatchItems = useMemo(
    () => rewatchItems.filter((e) => e.media_type === activeMediaType),
    [rewatchItems, activeMediaType]
  );

  const rewatchTotalPages = Math.max(1, Math.ceil(filteredRewatchItems.length / ITEMS_PER_PAGE));
  const pagedRewatchItems = filteredRewatchItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Hero — mobile only
  const pickHero = useCallback(() => {
    const candidates = mediaItems.filter((e) => e.poster);
    if (candidates.length > 0) {
      setHeroEntry(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }, [mediaItems]);

  useEffect(() => {
    pickHero();
    const interval = setInterval(pickHero, 5000);
    return () => clearInterval(interval);
  }, [pickHero]);

  // TMDB search for adding to watchlist
  useEffect(() => {
    if (!addQuery.trim()) { setAddResults([]); return; }
    const timeout = setTimeout(async () => {
      setAddLoading(true);
      const res = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(addQuery)}`);
      const data = await res.json();
      const results = (data.results || [])
        .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
        .slice(0, 6);
      setAddResults(results);
      setAddLoading(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [addQuery]);

  async function addToWatchlist(result: any) {
    const supabase = createClient();
    const existing = items.find((i) => i.tmdb_id === result.id);
    if (existing) return;

    const detailRes = await fetch(`/api/tmdb?action=detail&id=${result.id}&media_type=${result.media_type}`);
    const detail = await detailRes.json();

    const item: Partial<WatchlistItem> = {
      tmdb_id: result.id,
      media_type: result.media_type,
      title: result.title || result.name,
      year: (result.release_date || result.first_air_date || "").slice(0, 4) || null,
      genres: normalizeGenres((detail.genres || []).map((g: any) => g.name)),
      poster: result.poster_path,
      overview: result.overview,
      tmdb_rating: result.vote_average ? Math.round(result.vote_average * 10) / 10 : null,
      runtime: detail.runtime || null,
      seasons: detail.number_of_seasons || 0,
      episodes: detail.number_of_episodes || 0,
      imdb_id: detail.imdb_id || null,
    };

    const { data } = await supabase.from("watchlist").insert(item).select().single();
    if (data) {
      setItems((prev) => [data as WatchlistItem, ...prev]);
      setAddQuery("");
      setAddResults([]);
    }
  }

  async function removeFromWatchlist(id: string) {
    const supabase = createClient();
    await supabase.from("watchlist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function moveToLibrary(item: WatchlistItem) {
    setMovingToLibrary(item.id);
    const supabase = createClient();

    const entry = {
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      title: item.title,
      year: item.year,
      genres: item.genres,
      poster: item.poster,
      overview: item.overview,
      tmdb_rating: item.tmdb_rating,
      runtime: item.runtime,
      seasons: item.seasons,
      episodes: item.episodes,
      imdb_id: item.imdb_id,
      my_rating: 7,
      tags: [],
      recommended: false,
      rewatch: false,
    };

    const { error } = await supabase.from("entries").insert(entry);
    if (!error) {
      await supabase.from("watchlist").delete().eq("id", item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setMovingToLibrary(null);
  }

  // Flow navigation
  function handleCategorySelect(mediaType: MediaType) {
    setFlow({ stage: "results", mediaType });
    router.push(`/watchlist?tab=${mediaType}`, { scroll: false });
  }

  function handleBreadcrumbClick(index: number) {
    if (index === 0) {
      setFlow({ stage: "category" });
      router.push("/watchlist", { scroll: false });
    }
    if (index <= 1) {
      setGenreFilter(null);
      setSearchQuery("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
      </div>
    );
  }

  const isMovie = mediaTab === "movie";

  // Theme colors from PAGE_GLOWS
  const pageGlows = PAGE_GLOWS["/watchlist"];
  const themeRgb = isMovie ? pageGlows.movie : pageGlows.tv;
  const rgb = themeRgb.join(",");

  // Convert WatchlistItem to Entry-like for PreviewBar
  const displayItem = peekedEntry || filteredItems[0] || null;
  const displayEntry = displayItem ? {
    ...displayItem,
    my_rating: displayItem.tmdb_rating || 0,
    tags: [],
    recommended: false,
    rewatch: false,
    seasons_watched: 0,
    season_episode_counts: null,
    year_watched: null,
  } : null;

  const activeFilterCount = (genreFilter ? 1 : 0) + (ratingFilter !== "any" ? 1 : 0) + (searchQuery ? 1 : 0);

  const breadcrumbPath = flow.stage === "results"
    ? ["Watchlist", mediaTab === "movie" ? "Movies" : "TV Shows", ...(genreFilter ? [genreFilter] : [])]
    : [];

  // ─── Paginated card grid (shared between watchlist & rewatch) ───
  function renderCardGrid(
    cardItems: (WatchlistItem | Entry)[],
    isRewatch: boolean,
    pages: number,
  ) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-1 py-1">
        <div className="flex items-center w-full flex-1 min-h-0">
          {/* Left arrow */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="shrink-0 w-8 h-full flex items-center justify-center disabled:opacity-10 disabled:cursor-not-allowed transition-all group"
            style={{ color: `rgb(${rgb})` }}
          >
            <ChevronDown
              size={36}
              className="rotate-90 transition-all duration-300 group-hover:scale-125"
              style={{
                filter: currentPage === 1 ? "none" : `drop-shadow(0 0 8px rgba(${rgb},0.6)) drop-shadow(0 0 20px rgba(${rgb},0.3))`,
              }}
            />
          </button>

          {cardItems.length > 0 ? (
            <div className="poster-grid grid grid-cols-4 gap-2 flex-1 min-h-0 px-1">
              {cardItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`poster-card flex gap-2.5 p-2.5 rounded-lg bg-[rgba(12,12,16,0.6)] border animate-slide-in cursor-pointer ${
                    isRewatch
                      ? "border-vr-violet/20"
                      : "border-border-glow/50"
                  }`}
                  style={{ animationDelay: `${Math.min(i * 20, 250)}ms` }}
                  onMouseEnter={() => !isRewatch && setPeekedEntry(item as WatchlistItem)}
                  onClick={() => isRewatch ? setSelectedItem(item as any) : setSelectedItem(item as WatchlistItem)}
                >
                  {item.poster && (
                    <img
                      src={posterUrl(item.poster, "medium")}
                      alt={item.title}
                      className="w-[45px] h-[67px] rounded-[3px] object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[11px] font-medium text-[#e8e4dc] tracking-wide leading-tight truncate">
                      {item.title}
                    </h3>
                    <p className="font-mono-stats text-[9px] text-[#5c5954] mt-0.5">
                      {item.year} · {item.genres?.slice(0, 2).join(", ")}
                      {item.tmdb_rating && <> · <Star size={8} className="inline -mt-0.5" /> {item.tmdb_rating}</>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {isRewatch ? (
                        <span className="px-2 py-0.5 rounded text-[8px] font-display uppercase tracking-wider text-vr-violet border border-vr-violet/20 bg-vr-violet/10">
                          <RotateCcw size={8} className="inline -mt-0.5 mr-1" />
                          Rewatch · {(item as Entry).my_rating}/10
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveToLibrary(item as WatchlistItem); }}
                            disabled={movingToLibrary === item.id}
                            className="px-2 py-1 rounded text-[8px] font-display uppercase tracking-wider bg-vr-blue/15 text-vr-blue border border-vr-blue/25 hover:bg-vr-blue/25 transition-all disabled:opacity-50"
                          >
                            {movingToLibrary === item.id ? "..." : "Watched — Add to Library"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.id); }}
                            className="p-1 rounded text-[#5c5954] hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <X size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                {isRewatch ? (
                  <>
                    <RotateCcw size={24} className="mx-auto mb-2 text-[#5c5954]" />
                    <p className="font-body text-sm text-[#5c5954]">No {mediaTab === "movie" ? "movies" : "TV shows"} marked for rewatch</p>
                  </>
                ) : (
                  <>
                    <Bookmark size={28} className="text-[#5c5954]/20 mx-auto mb-3" />
                    <p className="font-body text-sm text-[#5c5954]">
                      {items.length === 0
                        ? "Nothing queued yet."
                        : "No matches for your filters."}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Right arrow */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
            disabled={currentPage === pages}
            className="shrink-0 w-8 h-full flex items-center justify-center disabled:opacity-10 disabled:cursor-not-allowed transition-all group"
            style={{ color: `rgb(${rgb})` }}
          >
            <ChevronDown
              size={36}
              className="-rotate-90 transition-all duration-300 group-hover:scale-125"
              style={{
                filter: currentPage === pages ? "none" : `drop-shadow(0 0 8px rgba(${rgb},0.6)) drop-shadow(0 0 20px rgba(${rgb},0.3))`,
              }}
            />
          </button>
        </div>

        {/* Page indicator */}
        {pages > 1 && (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="font-mono-stats text-[11px] font-bold disabled:opacity-15 disabled:cursor-not-allowed transition-all hover:scale-110"
              style={{ color: `rgb(${rgb})`, textShadow: currentPage === 1 ? "none" : `0 0 6px rgba(${rgb},0.4)` }}
            >
              ««
            </button>
            <span
              className="font-mono-stats text-[12px] font-bold"
              style={{ color: `rgb(${rgb})`, textShadow: `0 0 8px rgba(${rgb},0.5)` }}
            >
              {currentPage} / {pages}
            </span>
            <button
              onClick={() => setCurrentPage(pages)}
              disabled={currentPage === pages}
              className="font-mono-stats text-[11px] font-bold disabled:opacity-15 disabled:cursor-not-allowed transition-all hover:scale-110"
              style={{ color: `rgb(${rgb})`, textShadow: currentPage === pages ? "none" : `0 0 6px rgba(${rgb},0.4)` }}
            >
              »»
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Desktop: TV content based on flow state ───
  const desktopTvContent = (() => {
    switch (flow.stage) {
      case "category":
        return (
          <TvCategorySelect
            area="Watchlist"
            movieCount={movieCount}
            tvCount={tvCount}
            favCount={0}
            onSelect={handleCategorySelect}
            onBack={() => router.push("/", { scroll: false })}
            onFavourites={() => {}}
            icon={Bookmark}
            accentColor="text-[#b026ff]"
            accentGlow="drop-shadow(0 0 8px rgba(176,38,255,0.5))"
            glowClass=""
            movieRgb={pageGlows.movie.join(",")}
            tvRgb={pageGlows.tv.join(",")}
          />
        );

      case "results":
        return (
          <div className="flex flex-col h-full">
            {/* Top bar: breadcrumb + controls */}
            <WatchlistToolbar
              breadcrumbPath={breadcrumbPath}
              onBreadcrumbClick={handleBreadcrumbClick}
              sortBy={sortBy}
              setSortBy={(s) => setSortBy(s as SortKey)}
              ratingFilter={ratingFilter}
              setRatingFilter={(r) => setRatingFilter(r as RatingKey)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              addQuery={addQuery}
              setAddQuery={setAddQuery}
              addResults={addResults}
              items={items}
              onAddToWatchlist={addToWatchlist}
              showRewatch={showRewatch}
              setShowRewatch={setShowRewatch}
              onFilterOpen={() => setFilterOpen(true)}
              activeFilterCount={activeFilterCount}
              onClearFilters={() => { setGenreFilter(null); setRatingFilter("any"); setSearchQuery(""); }}
              themeRgb={rgb}
              totalCount={showRewatch ? filteredRewatchItems.length : filteredItems.length}
            />

            {/* Active filters summary */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 px-6 py-1">
                {genreFilter && (
                  <button onClick={() => setGenreFilter(null)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-colors" style={{ color: `rgb(${rgb})`, backgroundColor: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.2)` }}>
                    {genreFilter} <span className="ml-0.5">×</span>
                  </button>
                )}
                {ratingFilter !== "any" && (
                  <button onClick={() => setRatingFilter("any")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-colors" style={{ color: `rgb(${rgb})`, backgroundColor: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.2)` }}>
                    TMDB {ratingFilter} <span className="ml-0.5">×</span>
                  </button>
                )}
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider text-[#9a968e] bg-[#1e1e26] border border-border-glow hover:bg-[#252530] transition-colors">
                    &ldquo;{searchQuery}&rdquo; <span className="ml-0.5">×</span>
                  </button>
                )}
              </div>
            )}

            {/* Card grid */}
            {showRewatch
              ? (rewatchLoading
                ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-vr-violet/30 border-t-vr-violet rounded-full animate-spin" />
                  </div>
                )
                : renderCardGrid(pagedRewatchItems, true, rewatchTotalPages))
              : renderCardGrid(pagedItems, false, totalPages)
            }
          </div>
        );
    }
  })();

  // ─── Mobile card list (scrollable, not paginated) ───
  const mobileCardList = (
    <div className="space-y-1.5">
      {(showRewatch ? filteredRewatchItems : filteredItems).map((item, i) => {
        const isRewatch = showRewatch;
        return (
          <div
            key={item.id}
            className={`flex gap-3 p-2.5 rounded-lg bg-[rgba(12,12,16,0.6)] border animate-slide-in cursor-pointer transition-all duration-200 ${
              isRewatch
                ? "border-vr-violet/20 hover:border-vr-violet/40"
                : "border-border-glow/50 hover:border-border-glow"
            }`}
            style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
            onClick={() => setSelectedItem(item as any)}
          >
            {item.poster && (
              <img
                src={posterUrl(item.poster, "medium")}
                alt={item.title}
                className="w-[45px] h-[67px] rounded-[3px] object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-[11px] font-medium text-[#e8e4dc] tracking-wide leading-tight truncate">
                {item.title}
              </h3>
              <p className="font-mono-stats text-[9px] text-[#5c5954] mt-0.5">
                {item.year} · {item.genres?.slice(0, 2).join(", ")}
                {item.tmdb_rating && <> · <Star size={8} className="inline -mt-0.5" /> {item.tmdb_rating}</>}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {isRewatch ? (
                  <span className="px-2 py-0.5 rounded text-[8px] font-display uppercase tracking-wider text-vr-violet border border-vr-violet/20 bg-vr-violet/10">
                    <RotateCcw size={8} className="inline -mt-0.5 mr-1" />
                    Rewatch · {(item as Entry).my_rating}/10
                  </span>
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveToLibrary(item as WatchlistItem); }}
                      disabled={movingToLibrary === item.id}
                      className="px-2 py-1 rounded text-[8px] font-display uppercase tracking-wider bg-vr-blue/15 text-vr-blue border border-vr-blue/25 hover:bg-vr-blue/25 transition-all disabled:opacity-50"
                    >
                      {movingToLibrary === item.id ? "..." : "Watched — Add to Library"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.id); }}
                      className="p-1 rounded text-[#5c5954] hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="px-4 pt-1 pb-0 flex flex-col flex-1 min-h-0 overflow-hidden lg:px-5 lg:pt-3 lg:pb-0 lg:overflow-hidden">

      {/* ═══ MOBILE LAYOUT ═══ */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        {/* Hero banner */}
        {heroEntry && (
          <div className="relative mb-2 animate-fade-up flex-shrink-0">
            <div
              className="absolute inset-0 -mx-4"
              style={{
                backgroundImage: `url(${posterUrl(heroEntry.poster, "large")})`,
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
                src={posterUrl(heroEntry.poster, "small")}
                alt={heroEntry.title}
                className="w-[60px] h-[90px] rounded-[8px] object-cover shadow-[0_6px_30px_rgba(0,0,0,0.5)] flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[8px] uppercase tracking-[2px] font-semibold mb-0.5 text-[#b026ff]">
                  On Your Watchlist
                </p>
                <h2 className="font-display text-base font-medium text-[#e8e4dc] tracking-wide mb-0.5 truncate">
                  {heroEntry.title}
                </h2>
                <div className="flex items-center gap-2">
                  {heroEntry.tmdb_rating && (
                    <span className="font-mono-stats text-sm font-bold" style={{ color: "#b026ff" }}>
                      TMDB {heroEntry.tmdb_rating}
                    </span>
                  )}
                  <span className="font-mono-stats text-xs text-[#5c5954]">
                    {heroEntry.year}
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
              href="/watchlist?tab=movie"
              className={`px-6 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${
                isMovie ? "text-white" : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
              style={isMovie ? { background: `linear-gradient(135deg, rgb(${pageGlows.movie.join(",")}), rgba(${pageGlows.movie.join(",")},0.7))` } : undefined}
            >
              🎬 Movies <span className="font-mono-stats text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">{movieCount}</span>
            </a>
            <a
              href="/watchlist?tab=tv"
              className={`px-6 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${
                !isMovie ? "text-white" : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
              style={!isMovie ? { background: `linear-gradient(135deg, rgb(${pageGlows.tv.join(",")}), rgba(${pageGlows.tv.join(",")},0.7))` } : undefined}
            >
              📺 TV <span className="font-mono-stats text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">{tvCount}</span>
            </a>
          </div>
        </div>

        {/* Mobile: filters */}
        <div className="mb-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="font-display text-[7px] uppercase tracking-wider text-[#5c5954] shrink-0">Sort:</span>
            <MobileDropdown
              value={sortBy}
              options={SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              onChange={(v) => setSortBy(v as SortKey)}
              rgb={rgb}
            />
            <span className="font-display text-[7px] uppercase tracking-wider text-[#5c5954] shrink-0">Rating:</span>
            <MobileDropdown
              value={ratingFilter}
              options={RATING_FILTERS.map((o) => ({ key: o.key, label: o.label }))}
              onChange={(v) => setRatingFilter(v as RatingKey)}
              rgb={rgb}
            />
            <div className="relative flex-1 min-w-0">
              <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5c5954]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-7 rounded-lg border border-border-glow/30 bg-[#0e0e14] pl-6 pr-2 font-body text-[9px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Mobile card list */}
        {(showRewatch ? filteredRewatchItems : filteredItems).length > 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto pb-20">{mobileCardList}</div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1">
            <Bookmark size={36} className="text-[#5c5954]/20 mb-4" />
            <p className="font-body text-[#5c5954]">
              {items.length === 0
                ? "Nothing queued yet. Use the search above to add films."
                : "No matches for your filters."}
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
          entry={flow.stage === "results" && !showRewatch ? displayEntry : null}
          onEdit={() => {}}
          isOn={tvOn}
        />
      </div>

      {/* Filter drawer */}
      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        genreFilter={genreFilter}
        setGenreFilter={setGenreFilter}
        tagFilter={null}
        setTagFilter={() => {}}
        availableTags={[]}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Detail modal */}
      {selectedItem && (
        <WatchlistDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onMoveToLibrary={(item) => { moveToLibrary(item); setSelectedItem(null); }}
          onRemove={(id) => { removeFromWatchlist(id); setSelectedItem(null); }}
        />
      )}
    </div>
  );
}

/* ── Watchlist Toolbar (inside TV, replaces BreadcrumbBar for watchlist) ── */

function WatchlistToolbar({
  breadcrumbPath, onBreadcrumbClick,
  sortBy, setSortBy,
  ratingFilter, setRatingFilter,
  searchQuery, setSearchQuery,
  addQuery, setAddQuery, addResults, items, onAddToWatchlist,
  showRewatch, setShowRewatch,
  onFilterOpen, activeFilterCount, onClearFilters,
  themeRgb, totalCount,
}: {
  breadcrumbPath: string[];
  onBreadcrumbClick: (i: number) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  ratingFilter: string;
  setRatingFilter: (r: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addQuery: string;
  setAddQuery: (q: string) => void;
  addResults: any[];
  items: WatchlistItem[];
  onAddToWatchlist: (r: any) => void;
  showRewatch: boolean;
  setShowRewatch: (v: boolean) => void;
  onFilterOpen: () => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  themeRgb: string;
  totalCount: number;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (ratingRef.current && !ratingRef.current.contains(e.target as Node)) setRatingOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const rgb = themeRgb;
  const accentStyle = { color: `rgb(${rgb})` };
  const accentGlow = { color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.3)` };
  const borderVal = `rgba(${rgb},0.2)`;
  const borderFocusVal = `rgba(${rgb},0.4)`;

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label || "TMDB";
  const currentRatingLabel = RATING_FILTERS.find((o) => o.key === ratingFilter)?.label || "Any";

  return (
    <div className="flex items-center justify-between px-4 lg:px-5 py-2 border-b border-border-glow/15">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-1 min-w-0 shrink-0">
        {breadcrumbPath.map((segment, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <span className="text-[#5c5954]/40 text-[10px]">›</span>}
            <button
              onClick={() => onBreadcrumbClick(i)}
              className={`font-display text-[11px] uppercase tracking-wider transition-colors truncate ${
                i === breadcrumbPath.length - 1 ? "" : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
              style={i === breadcrumbPath.length - 1 ? accentStyle : undefined}
            >
              {segment}
            </button>
          </span>
        ))}
      </div>

      {/* Right: all controls in one row */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search collection */}
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" style={accentStyle} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-7 w-40 pl-6 pr-2 rounded-lg bg-transparent font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none"
            style={{ border: `1px solid ${borderVal}` }}
            onFocus={(e) => { e.currentTarget.style.borderColor = borderFocusVal; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = borderVal; }}
          />
        </div>

        {/* Add to watchlist */}
        <div className="relative">
          <Plus size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" style={accentStyle} />
          <input
            type="text"
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder="Add to watchlist..."
            className="h-7 w-40 pl-6 pr-2 rounded-lg bg-transparent font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none"
            style={{ border: `1px solid ${borderVal}` }}
            onFocus={(e) => { e.currentTarget.style.borderColor = borderFocusVal; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = borderVal; }}
          />
          {/* Dropdown results */}
          {addResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border-glow bg-[#0e0e14] shadow-xl z-50 overflow-hidden min-w-[260px]">
              {addResults.map((r) => {
                const alreadyAdded = items.some((i) => i.tmdb_id === r.id);
                return (
                  <div
                    key={`${r.media_type}-${r.id}`}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-bg-3 transition-colors"
                  >
                    {r.poster_path && (
                      <img src={posterUrl(r.poster_path, "small")} alt="" className="w-6 h-9 rounded-[2px] object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[10px] text-[#e8e4dc] truncate">{r.title || r.name}</p>
                      <p className="font-mono-stats text-[8px] text-[#5c5954]">
                        {(r.release_date || r.first_air_date || "").slice(0, 4)} · {r.media_type}
                      </p>
                    </div>
                    <button
                      onClick={() => onAddToWatchlist(r)}
                      disabled={alreadyAdded}
                      className="shrink-0 px-2 py-1 rounded text-[8px] font-display uppercase tracking-wider transition-all"
                      style={alreadyAdded ? { color: "#5c5954", border: "1px solid rgba(255,255,255,0.08)" } : { color: `rgb(${rgb})`, backgroundColor: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.25)` }}
                    >
                      {alreadyAdded ? "Added" : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-bg-deep/40 transition-all hover:bg-bg-deep/70"
            style={{ border: `1px solid ${borderVal}`, ...accentGlow }}
          >
            <span className="font-display text-[9px] uppercase tracking-wider text-[#5c5954]">Sort by:</span>
            <span className="font-display text-[10px] uppercase tracking-wider">{currentSortLabel}</span>
            <ChevronDown size={10} className={`${sortOpen ? "rotate-180" : ""} transition-transform duration-200 opacity-50`} />
          </button>
          {sortOpen && (
            <div className="absolute top-full right-0 mt-1 z-20 min-w-[120px] rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter overflow-hidden">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-2 font-display text-[10px] uppercase tracking-wider transition-colors ${
                    sortBy === opt.key ? "bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"
                  }`}
                  style={sortBy === opt.key ? { color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.4)` } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rating dropdown */}
        <div className="relative" ref={ratingRef}>
          <button
            onClick={() => setRatingOpen(!ratingOpen)}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-bg-deep/40 transition-all hover:bg-bg-deep/70"
            style={{ border: `1px solid ${borderVal}`, ...accentGlow }}
          >
            <span className="font-display text-[9px] uppercase tracking-wider text-[#5c5954]">TMDB:</span>
            <span className="font-display text-[10px] uppercase tracking-wider">{currentRatingLabel}</span>
            <ChevronDown size={10} className={`${ratingOpen ? "rotate-180" : ""} transition-transform duration-200 opacity-50`} />
          </button>
          {ratingOpen && (
            <div className="absolute top-full right-0 mt-1 z-20 min-w-[100px] rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter overflow-hidden">
              {RATING_FILTERS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setRatingFilter(opt.key); setRatingOpen(false); }}
                  className={`w-full text-left px-3 py-2 font-display text-[10px] uppercase tracking-wider transition-colors ${
                    ratingFilter === opt.key ? "bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"
                  }`}
                  style={ratingFilter === opt.key ? { color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.4)` } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter button with icon — badge always takes space to prevent layout shift */}
        <button
          onClick={onFilterOpen}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border-glow/20 text-[#5c5954] transition-colors"
          onMouseEnter={(e) => { e.currentTarget.style.color = `rgb(${rgb})`; e.currentTarget.style.borderColor = `rgba(${rgb},0.4)`; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = ""; e.currentTarget.style.borderColor = ""; }}
        >
          <SlidersHorizontal size={12} />
          <span className="font-display text-[10px] uppercase tracking-wider">Filter</span>
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono-stats transition-opacity ${activeFilterCount > 0 ? "opacity-100" : "opacity-0"}`}
            style={{ backgroundColor: `rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}
          >
            {activeFilterCount || 0}
          </span>
        </button>

        {/* Rewatch toggle */}
        <button
          onClick={() => setShowRewatch(!showRewatch)}
          className={`flex items-center gap-1 h-7 px-2.5 rounded-lg border transition-all ${
            showRewatch
              ? "border-vr-violet/40 bg-vr-violet/15"
              : "text-[#5c5954] border-border-glow/20 hover:text-[#9a968e]"
          }`}
          style={showRewatch ? { color: `rgb(${rgb})` } : undefined}
        >
          <RotateCcw size={10} />
          <span className="font-display text-[10px] uppercase tracking-wider">Rewatch</span>
        </button>

        {/* Count */}
        <span className="font-mono-stats text-[9px] text-[#5c5954] shrink-0">
          {totalCount}
        </span>
      </div>
    </div>
  );
}

/* ── Watchlist Detail Modal (matching compact Library style) ── */

function WatchlistDetailModal({
  item, onClose, onMoveToLibrary, onRemove,
}: {
  item: WatchlistItem;
  onClose: () => void;
  onMoveToLibrary: (item: WatchlistItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:px-40 lg:py-16">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-modal-backdrop" onClick={onClose} />
      <div className="relative w-full max-w-lg lg:max-w-2xl rounded-xl border border-border-glow bg-[#0e0e14] animate-modal-enter">
        <div className="h-px rounded-t-xl" style={{ background: "linear-gradient(90deg, transparent 5%, #b026ff 30%, #0ea5e9 70%, transparent 95%)" }} />
        <button onClick={onClose} className="absolute top-2.5 right-2.5 z-10 p-1 rounded-lg bg-bg-deep/50 text-[#5c5954] hover:text-[#e8e4dc] transition-colors text-xs">✕</button>

        <div className="p-3">
          {/* Top: poster + info */}
          <div className="flex gap-3 mb-2">
            <div className="flex-shrink-0 w-16 lg:w-20 rounded-md overflow-hidden bg-bg-deep">
              {item.poster ? (
                <img src={posterUrl(item.poster, "medium")} alt={item.title} className="w-full aspect-[2/3] object-cover" />
              ) : (
                <div className="w-full aspect-[2/3] flex items-center justify-center text-[#5c5954] text-[9px]">No poster</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-1.5 py-px rounded text-[8px] font-display uppercase tracking-wider mb-0.5 ${item.media_type === "movie" ? "bg-vr-blue/15 text-vr-blue" : "bg-vr-violet/15 text-vr-violet"}`}>
                {item.media_type === "movie" ? "Film" : "TV"}
              </span>
              <h2 className="font-display text-sm font-medium text-[#e8e4dc] tracking-wide leading-tight">{item.title}</h2>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px]">
                <span className="font-mono-stats text-[#5c5954]">{item.year}</span>
                {item.media_type === "movie" && item.runtime ? (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-[#5c5954]">{item.runtime}m</span></>) : null}
                {item.media_type === "tv" && item.seasons > 0 && (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-[#5c5954]">{item.seasons}S·{item.episodes}E</span></>)}
                {item.tmdb_rating && (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-vr-blue/70">TMDB {Number(item.tmdb_rating).toFixed(1)}</span></>)}
                {item.imdb_id && (
                  <a href={`https://www.imdb.com/title/${item.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-vr-blue/50 hover:text-vr-blue transition-colors">IMDb ↗</a>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.genres?.slice(0, 4).map((g) => (
                  <span key={g} className="px-1.5 py-px rounded-full text-[8px] font-display uppercase tracking-wider border border-border-glow text-[#9a968e]">{g}</span>
                ))}
              </div>
            </div>
          </div>

          {item.overview && <p className="text-[10px] text-[#9a968e] font-body leading-relaxed mb-2 line-clamp-3">{item.overview}</p>}
          <div className="divider-gradient mb-2" />

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onMoveToLibrary(item)}
              className="flex-1 h-8 rounded-md font-display text-[9px] uppercase tracking-wider text-vr-blue border border-vr-blue/25 bg-vr-blue/10 hover:bg-vr-blue/20 transition-all"
            >
              Watched — Add to Library
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className="h-8 px-3 rounded-md font-display text-[9px] uppercase tracking-wider text-red-400/70 border border-red-500/15 hover:bg-red-500/10 transition-all"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
