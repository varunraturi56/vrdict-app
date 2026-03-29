"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, Search, ChevronDown, X, Plus, Star, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { posterUrl } from "@/lib/tmdb";
import { MAJOR_GENRES, type WatchlistItem, type Entry, type MediaType } from "@/lib/types";
import { TvFrame } from "@/components/ui/tv-frame";
import { PreviewBar } from "@/components/ui/preview-bar";

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

export default function WatchlistPage() {
  return (
    <Suspense>
      <WatchlistContent />
    </Suspense>
  );
}

function WatchlistContent() {
  const searchParams = useSearchParams();
  const mediaTab = (searchParams.get("tab") || "movie") as MediaType;

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("tmdb_rating");
  const [ratingFilter, setRatingFilter] = useState<RatingKey>("7+");
  const [searchQuery, setSearchQuery] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<any[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [heroEntry, setHeroEntry] = useState<WatchlistItem | null>(null);
  const [tvOn, setTvOn] = useState(true);
  const [peekedEntry, setPeekedEntry] = useState<WatchlistItem | null>(null);
  const [movingToLibrary, setMovingToLibrary] = useState<string | null>(null);
  const [showRewatch, setShowRewatch] = useState(false);
  const [rewatchItems, setRewatchItems] = useState<Entry[]>([]);
  const [rewatchLoading, setRewatchLoading] = useState(false);

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
  }, [mediaTab]);

  const mediaItems = useMemo(
    () => items.filter((e) => e.media_type === mediaTab),
    [items, mediaTab]
  );

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

  // Rewatch items filtered by current tab
  const filteredRewatchItems = useMemo(
    () => rewatchItems.filter((e) => e.media_type === mediaTab),
    [rewatchItems, mediaTab]
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

    // Fetch details for full info
    const detailRes = await fetch(`/api/tmdb?action=detail&id=${result.id}&media_type=${result.media_type}`);
    const detail = await detailRes.json();

    const item: Partial<WatchlistItem> = {
      tmdb_id: result.id,
      media_type: result.media_type,
      title: result.title || result.name,
      year: (result.release_date || result.first_air_date || "").slice(0, 4) || null,
      genres: (detail.genres || []).map((g: any) => g.name),
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

    // Add to entries (library)
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
      // Remove from watchlist
      await supabase.from("watchlist").delete().eq("id", item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setMovingToLibrary(null);
  }

  const pillClass = (active: boolean) =>
    `px-3.5 py-1.5 rounded-[20px] text-xs tracking-[0.3px] border cursor-pointer transition-all whitespace-nowrap ${
      active
        ? "text-vr-blue border-vr-blue/30 bg-[rgba(14,165,233,0.12)]"
        : "text-[#9a968e] border-border-glow bg-[rgba(12,12,16,0.85)] hover:text-[#e8e4dc]"
    }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
      </div>
    );
  }

  const movieCount = items.filter((e) => e.media_type === "movie").length;
  const tvCount = items.filter((e) => e.media_type === "tv").length;
  const isMovie = mediaTab === "movie";

  // Convert WatchlistItem to Entry-like for PreviewBar
  const displayItem = peekedEntry || filteredItems[0] || null;
  const displayEntry = displayItem ? {
    ...displayItem,
    my_rating: displayItem.tmdb_rating || 0,
    tags: [],
    recommended: false,
    rewatch: false,
    year_watched: null,
  } : null;

  // Rewatch grid
  const rewatchGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 p-1">
      {rewatchLoading ? (
        <div className="col-span-full flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-vr-violet/30 border-t-vr-violet rounded-full animate-spin" />
        </div>
      ) : filteredRewatchItems.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <RotateCcw size={24} className="mx-auto mb-2 text-[#5c5954]" />
          <p className="font-body text-[11px] text-[#5c5954]">No {mediaTab === "movie" ? "movies" : "TV shows"} marked for rewatch</p>
        </div>
      ) : (
        filteredRewatchItems.map((item, i) => (
          <div
            key={item.id}
            className="flex gap-3 p-2.5 rounded-lg bg-[rgba(12,12,16,0.6)] border border-vr-violet/20 animate-slide-in hover:border-vr-violet/40 transition-all"
            style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
          >
            {item.poster && (
              <img
                src={posterUrl(item.poster, "small")}
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
                <span className="px-2 py-0.5 rounded text-[8px] font-display uppercase tracking-wider text-vr-violet border border-vr-violet/20 bg-vr-violet/10">
                  <RotateCcw size={8} className="inline -mt-0.5 mr-1" />
                  Rewatch · {item.my_rating}/10
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Watchlist cards inside TV
  const watchlistGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 p-1">
      {filteredItems.map((item, i) => (
        <div
          key={item.id}
          className="flex gap-3 p-2.5 rounded-lg bg-[rgba(12,12,16,0.6)] border border-border-glow/50 animate-slide-in hover:border-border-glow transition-all"
          style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
          onMouseEnter={() => setPeekedEntry(item)}
        >
          {/* Poster */}
          {item.poster && (
            <img
              src={posterUrl(item.poster, "small")}
              alt={item.title}
              className="w-[45px] h-[67px] rounded-[3px] object-cover shrink-0"
            />
          )}
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[11px] font-medium text-[#e8e4dc] tracking-wide leading-tight truncate">
              {item.title}
            </h3>
            <p className="font-mono-stats text-[9px] text-[#5c5954] mt-0.5">
              {item.year} · {item.genres?.slice(0, 2).join(", ")}
              {item.tmdb_rating && <> · <Star size={8} className="inline -mt-0.5" /> {item.tmdb_rating}</>}
            </p>
            {/* Actions */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <button
                onClick={() => moveToLibrary(item)}
                disabled={movingToLibrary === item.id}
                className="px-2 py-1 rounded text-[8px] font-display uppercase tracking-wider bg-vr-blue/15 text-vr-blue border border-vr-blue/25 hover:bg-vr-blue/25 transition-all disabled:opacity-50"
              >
                {movingToLibrary === item.id ? "..." : "Watched — Add to Library"}
              </button>
              <button
                onClick={() => removeFromWatchlist(item.id)}
                className="p-1 rounded text-[#5c5954] hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const activeGrid = showRewatch ? rewatchGrid : watchlistGrid;

  return (
    <div className="px-4 pt-1 pb-0 flex flex-col flex-1 min-h-0 overflow-hidden lg:px-5 lg:pt-3 lg:pb-0 lg:overflow-hidden">
      {/* Hero banner — mobile only */}
      {heroEntry && (
        <div className="relative mb-2 animate-fade-up flex-shrink-0 lg:hidden">
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
      <div className="flex justify-center mb-2 flex-shrink-0 lg:hidden">
        <div className="flex items-center gap-2">
          <a
            href="/watchlist?tab=movie"
            className={`px-6 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${
              isMovie
                ? "bg-gradient-to-br from-vr-blue to-vr-blue-dark text-white"
                : "text-[#5c5954] hover:text-[#9a968e]"
            }`}
          >
            🎬 Movies <span className="font-mono-stats text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">{movieCount}</span>
          </a>
          <a
            href="/watchlist?tab=tv"
            className={`px-6 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${
              !isMovie
                ? "bg-gradient-to-br from-vr-violet to-vr-violet-dark text-white"
                : "text-[#5c5954] hover:text-[#9a968e]"
            }`}
          >
            📺 TV <span className="font-mono-stats text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">{tvCount}</span>
          </a>
        </div>
      </div>

      {/* Mobile: simple search */}
      <div className="lg:hidden mb-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5954]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search watchlist..."
              className="w-full h-7 rounded-[20px] border border-border-glow bg-[rgba(12,12,16,0.85)] pl-8 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/30"
            />
          </div>
        </div>
      </div>

      {/* Desktop: filter rows */}
      <div className="hidden lg:block space-y-1 mb-2 flex-shrink-0 px-32 relative z-10">
        {/* Row 1: Genre + Sort + Rating */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="font-display text-[9px] uppercase tracking-[0.15em] text-vr-blue shrink-0">Genre</span>
          <button onClick={() => setGenreFilter(null)} className={pillClass(!genreFilter)}>All</button>
          {MAJOR_GENRES.map((g) => (
            <button key={g} onClick={() => setGenreFilter(genreFilter === g ? null : g)} className={pillClass(genreFilter === g)}>
              {g}
            </button>
          ))}
          <span className="font-display text-[9px] uppercase tracking-[0.15em] text-vr-violet shrink-0 ml-2">Sort</span>
          {SORT_OPTIONS.map((opt) => (
            <button key={opt.key} onClick={() => setSortBy(opt.key)} className={pillClass(sortBy === opt.key)}>
              {opt.label}
            </button>
          ))}

          {/* Rewatch toggle */}
          <button
            onClick={() => setShowRewatch(!showRewatch)}
            className={`ml-3 px-3.5 py-1 rounded-[20px] text-[10px] font-display uppercase tracking-[0.15em] border cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              showRewatch
                ? "text-vr-violet border-vr-violet/40 bg-vr-violet/15"
                : "text-[#9a968e] border-border-glow bg-[rgba(12,12,16,0.85)] hover:text-[#e8e4dc]"
            }`}
          >
            <RotateCcw size={10} />
            Rewatch
          </button>
        </div>

        {/* Row 2: Rating filter + Search + Add to watchlist */}
        <div className="flex items-center gap-1.5 scrollbar-none">
          <span className="font-display text-[9px] uppercase tracking-[0.15em] text-vr-blue shrink-0">Rating</span>
          {RATING_FILTERS.map((r) => (
            <button key={r.key} onClick={() => setRatingFilter(r.key)} className={pillClass(ratingFilter === r.key)}>
              {r.label}
            </button>
          ))}

          {/* Search collection */}
          <div className="relative flex-1 min-w-[120px] ml-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5954]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collection..."
              className="w-full h-7 rounded-[20px] border border-border-glow bg-[rgba(12,12,16,0.85)] pl-8 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/30"
            />
          </div>

          {/* Add to watchlist */}
          <div className="relative flex-1 min-w-[140px]">
            <Plus size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-vr-violet" />
            <input
              type="text"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="Add to watchlist..."
              className="w-full h-7 rounded-[20px] border border-vr-violet/20 bg-[rgba(12,12,16,0.85)] pl-8 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-violet/40"
            />
            {/* Dropdown results */}
            {addResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border-glow bg-bg-card shadow-xl z-50 overflow-hidden">
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
                        onClick={() => addToWatchlist(r)}
                        disabled={alreadyAdded}
                        className={`shrink-0 px-2 py-1 rounded text-[8px] font-display uppercase tracking-wider transition-all ${
                          alreadyAdded
                            ? "text-[#5c5954] border border-border-glow cursor-default"
                            : "bg-vr-violet/15 text-vr-violet border border-vr-violet/25 hover:bg-vr-violet/25"
                        }`}
                      >
                        {alreadyAdded ? "Added" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <span className="font-mono-stats text-[9px] text-[#5c5954] shrink-0">
            {showRewatch ? `${filteredRewatchItems.length} rewatch` : `${filteredItems.length} titles`}
          </span>
        </div>
      </div>

      {/* Content — TV frame on desktop */}
      {(filteredItems.length > 0 || showRewatch) ? (
        <>
          <div className="hidden md:flex md:flex-col flex-1 min-h-0 relative">
            {/* LED Play bars */}
            <div className="absolute z-[3] pointer-events-none hidden lg:flex flex-col items-center" style={{ left: 36, top: "20%", bottom: 18 }}>
              <div className="absolute inset-0 -inset-x-6 rounded-full opacity-40 blur-xl" style={{ background: "linear-gradient(180deg, rgba(14,165,233,0.15), rgba(139,92,246,0.10))" }} />
              <div className="relative flex-1 w-[16px] rounded-[8px] bg-[#0a0a0c] border border-[#1a1a1c]" style={{ boxShadow: "inset 0 1px 4px rgba(0,0,0,0.9), 0 0 1px rgba(255,255,255,0.03), 0 0 20px 4px rgba(14,165,233,0.08), 0 0 40px 8px rgba(139,92,246,0.05)" }} />
              <div className="relative w-[36px] h-[10px] rounded-b-[4px] bg-[#060608] border border-t-0 border-[#151517] mt-[-1px]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.02)" }} />
            </div>
            <div className="absolute z-[3] pointer-events-none hidden lg:flex flex-col items-center" style={{ right: 36, top: "20%", bottom: 18 }}>
              <div className="absolute inset-0 -inset-x-6 rounded-full opacity-40 blur-xl" style={{ background: "linear-gradient(180deg, rgba(14,165,233,0.15), rgba(139,92,246,0.10))" }} />
              <div className="relative flex-1 w-[16px] rounded-[8px] bg-[#0a0a0c] border border-[#1a1a1c]" style={{ boxShadow: "inset 0 1px 4px rgba(0,0,0,0.9), 0 0 1px rgba(255,255,255,0.03), 0 0 20px 4px rgba(14,165,233,0.08), 0 0 40px 8px rgba(139,92,246,0.05)" }} />
              <div className="relative w-[36px] h-[10px] rounded-b-[4px] bg-[#060608] border border-t-0 border-[#151517] mt-[-1px]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.02)" }} />
            </div>

            <TvFrame isOn={tvOn} onPowerToggle={() => setTvOn(!tvOn)}>{activeGrid}</TvFrame>
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
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto pb-20">{activeGrid}</div>
        </>
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
  );
}
