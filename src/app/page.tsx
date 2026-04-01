"use client";

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Library as LibraryIcon, Search, ChevronDown, Star, Bookmark, Radar, BarChart3 } from "lucide-react";
import { MobileDropdown } from "@/components/ui/mobile-dropdown";
import { createClient } from "@/lib/supabase/client";
import { posterUrl } from "@/lib/tmdb";
import { MAJOR_GENRES, DEFAULT_TAGS, type Entry, type MediaType } from "@/lib/types";
import { TvFrame } from "@/components/ui/tv-frame";
import { LedBars } from "@/components/ui/led-bar";
import { PreviewBar } from "@/components/ui/preview-bar";
import { TvWelcome } from "@/components/ui/tv-welcome";
import { TvCategorySelect } from "@/components/ui/tv-category-select";
import { BreadcrumbBar } from "@/components/ui/breadcrumb-bar";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { useLibraryCounts } from "@/lib/library-context";

const SORT_OPTIONS = [
  { key: "my_rating", label: "Rating" },
  { key: "title", label: "Title" },
  { key: "year", label: "Year" },
  { key: "tmdb_rating", label: "TMDB" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

// Desktop flow state
type FlowState =
  | { stage: "welcome" }
  | { stage: "category"; area: string }
  | { stage: "results"; area: string; mediaType: MediaType };

const ITEMS_PER_PAGE = 14;

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  );
}

function LibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mediaTab = (searchParams.get("tab") || "movie") as MediaType;
  const { setCounts } = useLibraryCounts();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("my_rating");
  const [searchQuery, setSearchQuery] = useState("");
  const [heroEntry, setHeroEntry] = useState<Entry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [tvOn, setTvOn] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Desktop flow state — progressive disclosure
  // If URL has ?tab=, jump straight to results (e.g. from Library nav click)
  const hasTab = searchParams.get("tab");
  const [flow, setFlow] = useState<FlowState>(
    hasTab
      ? { stage: "results", area: "Library", mediaType: (hasTab || "movie") as MediaType }
      : { stage: "welcome" }
  );

  // When URL changes (e.g. clicking Home in nav removes ?tab), update flow
  useEffect(() => {
    const tab = searchParams.get("tab");
    const view = searchParams.get("view");
    if (tab) {
      setFlow({ stage: "results", area: "Library", mediaType: tab as MediaType });
    } else if (view === "library") {
      setFlow({ stage: "category", area: "Library" });
    } else {
      setFlow({ stage: "welcome" });
    }
  }, [searchParams]);

  // Preview bar (desktop only)
  const [peekedEntry, setPeekedEntry] = useState<Entry | null>(null);

  function handleMouseEnter(entry: Entry) {
    setPeekedEntry(entry);
  }

  // Fetch entries
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("entries")
        .select("*")
        .order("added_at", { ascending: false });
      if (data) setEntries(data as Entry[]);
      setLoading(false);
    }
    load();
  }, []);

  // Publish counts
  const movieCount = entries.filter((e) => e.media_type === "movie").length;
  const tvCount = entries.filter((e) => e.media_type === "tv").length;
  const favCount = entries.filter((e) => e.recommended).length;

  useEffect(() => {
    setCounts({ movieCount, tvCount });
  }, [movieCount, tvCount, setCounts]);

  // Reset filters on tab change
  useEffect(() => {
    setGenreFilter(null);
    setTagFilter(null);
    setSearchQuery("");
    setCurrentPage(1);
  }, [mediaTab]);

  // Use flow's mediaType when in results to avoid flash of old tab
  const activeMediaType = flow.stage === "results" ? flow.mediaType : mediaTab;

  const mediaEntries = useMemo(
    () => entries.filter((e) => e.media_type === activeMediaType),
    [entries, activeMediaType]
  );

  const topTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    mediaEntries.forEach((e) =>
      e.tags?.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; })
    );
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [mediaEntries]);

  const filteredEntries = useMemo(() => {
    let result = mediaEntries;
    if (genreFilter) result = result.filter((e) => e.genres?.includes(genreFilter));
    if (tagFilter) result = result.filter((e) => e.tags?.includes(tagFilter));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "my_rating": return (b.my_rating || 0) - (a.my_rating || 0);
        case "title": return a.title.localeCompare(b.title);
        case "year": return (b.year || "").localeCompare(a.year || "");
        case "tmdb_rating": return (b.tmdb_rating || 0) - (a.tmdb_rating || 0);
        default: return 0;
      }
    });
  }, [mediaEntries, genreFilter, tagFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE));
  const pagedEntries = filteredEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [genreFilter, tagFilter, searchQuery, sortBy]);

  // Hero — auto-rotate (mobile only)
  const pickHero = useCallback(() => {
    const candidates = mediaEntries.filter((e) => e.my_rating >= 7 && e.poster);
    if (candidates.length > 0) {
      setHeroEntry(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }, [mediaEntries]);

  useEffect(() => {
    pickHero();
    const interval = setInterval(pickHero, 5000);
    return () => clearInterval(interval);
  }, [pickHero]);

  // Flow navigation handlers
  function handleWelcomeNavigate(area: "library" | "favourites" | "watchlist" | "discover" | "stats") {
    if (area === "library") {
      setFlow({ stage: "category", area: "Library" });
      router.push("/?view=library", { scroll: false });
    } else if (area === "favourites") {
      router.push("/favourites");
    } else if (area === "watchlist") {
      router.push("/watchlist");
    } else if (area === "discover") {
      router.push("/discover");
    } else if (area === "stats") {
      router.push("/stats");
    }
  }

  function handleCategorySelect(mediaType: MediaType) {
    setFlow({ stage: "results", area: "Library", mediaType });
    // Sync URL tab
    router.push(`/?tab=${mediaType}`, { scroll: false });
  }

  function handleBreadcrumbClick(index: number) {
    if (index === 0) {
      // Library breadcrumb → go to category select (pick Movies/TV)
      setFlow({ stage: "category", area: "Library" });
      router.push("/?view=library", { scroll: false });
    }
    // index 1+ = current media type or filter, just clear filters
    if (index <= 1) {
      setGenreFilter(null);
      setTagFilter(null);
      setSearchQuery("");
    }
  }

  const activeFilterCount = (genreFilter ? 1 : 0) + (tagFilter ? 1 : 0) + (searchQuery ? 1 : 0);

  // Breadcrumb path
  const breadcrumbPath = flow.stage === "results"
    ? ["Library", mediaTab === "movie" ? "Movies" : "TV Shows", ...(genreFilter ? [genreFilter] : [])]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
      </div>
    );
  }

  const isMovie = mediaTab === "movie";
  const displayEntry = peekedEntry || filteredEntries.find((e) => e.my_rating >= 7 && e.poster) || filteredEntries[0] || null;

  // ─── Desktop: TV content based on flow state ───
  const desktopTvContent = (() => {
    switch (flow.stage) {
      case "welcome":
        return <TvWelcome onNavigate={handleWelcomeNavigate} />;

      case "category":
        return (
          <TvCategorySelect
            area={flow.area}
            movieCount={movieCount}
            tvCount={tvCount}
            favCount={favCount}
            onSelect={handleCategorySelect}
            onBack={() => { setFlow({ stage: "welcome" }); router.push("/", { scroll: false }); }}
            onFavourites={() => router.push("/favourites")}
          />
        );

      case "results":
        return (
          <div className="flex flex-col h-full">
            <BreadcrumbBar
              path={breadcrumbPath}
              onPathClick={handleBreadcrumbClick}
              sortBy={sortBy}
              setSortBy={(s) => setSortBy(s as SortKey)}
              sortOptions={SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              onFilterOpen={() => setFilterOpen(true)}
              activeFilterCount={activeFilterCount}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onClearFilters={() => { setGenreFilter(null); setTagFilter(null); setSearchQuery(""); }}
              accentColor={isMovie ? "blue" : "violet"}
            />

            {/* Active filters summary */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 px-6 py-1.5">
                {genreFilter && (
                  <button onClick={() => setGenreFilter(null)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider text-vr-blue bg-vr-blue/10 border border-vr-blue/20 hover:bg-vr-blue/15 transition-colors">
                    {genreFilter} <span className="ml-0.5">×</span>
                  </button>
                )}
                {tagFilter && (
                  <button onClick={() => setTagFilter(null)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider text-vr-violet bg-vr-violet/10 border border-vr-violet/20 hover:bg-vr-violet/15 transition-colors">
                    {tagFilter} <span className="ml-0.5">×</span>
                  </button>
                )}
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider text-[#9a968e] bg-[#1e1e26] border border-border-glow hover:bg-[#252530] transition-colors">
                    &ldquo;{searchQuery}&rdquo; <span className="ml-0.5">×</span>
                  </button>
                )}
              </div>
            )}

            {/* Paginated poster grid — 7×2 with flashy arrows */}
            {(() => {
              const rgb = isMovie ? "14,165,233" : "139,92,246";
              const tabColor = isMovie ? "text-vr-blue" : "text-vr-violet";
              return (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-1 py-2">
                  <div className="flex items-center w-full flex-1 min-h-0">
                    {/* Left arrow — big & glowy */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`shrink-0 w-10 h-full flex items-center justify-center ${tabColor} disabled:opacity-10 disabled:cursor-not-allowed transition-all group`}
                    >
                      <ChevronDown
                        size={44}
                        className="rotate-90 transition-all duration-300 group-hover:scale-125"
                        style={{
                          filter: currentPage === 1 ? "none" : `drop-shadow(0 0 8px rgba(${rgb},0.6)) drop-shadow(0 0 20px rgba(${rgb},0.3))`,
                        }}
                      />
                    </button>

                    {pagedEntries.length > 0 ? (
                      <div className="poster-grid grid grid-cols-7 gap-1.5 flex-1 min-h-0">
                        {pagedEntries.map((entry, i) => (
                          <div
                            key={entry.id}
                            className="poster-card relative overflow-hidden bg-bg-deep cursor-pointer animate-slide-in rounded-md"
                            style={{ animationDelay: `${Math.min(i * 20, 250)}ms`, border: "1px solid rgba(255,255,255,0.05)" }}
                            onClick={() => setSelectedEntry(entry)}
                            onMouseEnter={() => handleMouseEnter(entry)}
                          >
                            <div className="aspect-[2/3]">
                              {entry.poster ? (
                                <img
                                  src={posterUrl(entry.poster, "medium")}
                                  alt={entry.title}
                                  className="w-full h-full object-cover rounded-md"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-[8px] font-display p-1 text-center bg-bg-card rounded-md">
                                  {entry.title}
                                </div>
                              )}
                            </div>
                            {entry.recommended && (
                              <div className="absolute top-0.5 left-0.5 text-[9px] drop-shadow-lg">⭐</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <LibraryIcon size={28} className="text-[#5c5954]/20 mx-auto mb-3" />
                          <p className="font-body text-sm text-[#5c5954]">
                            {entries.length === 0
                              ? "Your collection is empty."
                              : "No matches for your filters."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Right arrow — big & glowy */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`shrink-0 w-10 h-full flex items-center justify-center ${tabColor} disabled:opacity-10 disabled:cursor-not-allowed transition-all group`}
                    >
                      <ChevronDown
                        size={44}
                        className="-rotate-90 transition-all duration-300 group-hover:scale-125"
                        style={{
                          filter: currentPage === totalPages ? "none" : `drop-shadow(0 0 8px rgba(${rgb},0.6)) drop-shadow(0 0 20px rgba(${rgb},0.3))`,
                        }}
                      />
                    </button>
                  </div>

                  {/* Page indicator with first/last arrows */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className={`font-mono-stats text-[11px] font-bold ${tabColor} disabled:opacity-15 disabled:cursor-not-allowed transition-all hover:scale-110`}
                        style={{ textShadow: currentPage === 1 ? "none" : `0 0 6px rgba(${rgb},0.4)` }}
                      >
                        ««
                      </button>
                      <span
                        className={`font-mono-stats text-[12px] font-bold ${tabColor}`}
                        style={{ textShadow: `0 0 8px rgba(${rgb},0.5)` }}
                      >
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`font-mono-stats text-[11px] font-bold ${tabColor} disabled:opacity-15 disabled:cursor-not-allowed transition-all hover:scale-110`}
                        style={{ textShadow: currentPage === totalPages ? "none" : `0 0 6px rgba(${rgb},0.4)` }}
                      >
                        »»
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
    }
  })();

  // ─── Mobile: poster grid (unchanged scroll behaviour) ───
  const mobilePosterGrid = (
    <div className="poster-grid grid grid-cols-3 sm:grid-cols-4 gap-0.5">
      {filteredEntries.map((entry, i) => (
        <div
          key={entry.id}
          className="poster-card relative overflow-hidden bg-bg-deep cursor-pointer animate-slide-in"
          style={{ animationDelay: `${Math.min(i * 30, 400)}ms`, border: "1px solid rgba(255,255,255,0.05)" }}
          onClick={() => setSelectedEntry(entry)}
        >
          <div className="aspect-[2/3]">
            {entry.poster ? (
              <img
                src={posterUrl(entry.poster, "medium")}
                alt={entry.title}
                className="w-full h-full object-cover rounded-[6px]"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-[8px] font-display p-1 text-center bg-bg-card rounded-[6px]">
                {entry.title}
              </div>
            )}
          </div>
          {entry.recommended && (
            <div className="absolute top-0.5 left-0.5 text-[8px] drop-shadow-lg">⭐</div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-4 pt-1 pb-0 flex flex-col flex-1 min-h-0 overflow-hidden lg:px-5 lg:pt-3 lg:pb-0 lg:overflow-hidden">

      {/* ═══ MOBILE LAYOUT ═══ */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        {!hasTab && !searchParams.get("view") ? (
          /* ── Mobile Home: navigation cards ── */
          <div className="flex flex-col flex-1 justify-center px-3 pb-16">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-semibold tracking-wider mb-1">
                <span className="text-vr-blue text-glow-blue">VR</span>
                <span className="text-vr-violet">dict</span>
              </h1>
              <p className="font-display text-[10px] uppercase tracking-[3px] text-[#5c5954]">Your Collection</p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/?view=library" className="flex items-center gap-4 px-5 py-4 rounded-xl border border-vr-blue/20 bg-vr-blue/[0.04] active:bg-vr-blue/[0.08] transition-all">
                <LibraryIcon size={26} className="text-vr-blue shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-sm uppercase tracking-wider text-vr-blue">Library</p>
                  <p className="font-mono-stats text-[10px] text-[#5c5954]">{movieCount + tvCount} titles</p>
                </div>
              </Link>
              <Link href="/favourites" className="flex items-center gap-4 px-5 py-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] active:bg-amber-400/[0.08] transition-all">
                <Star size={26} className="text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-sm uppercase tracking-wider text-amber-400">Favourites</p>
                  <p className="font-mono-stats text-[10px] text-[#5c5954]">{favCount} titles</p>
                </div>
              </Link>
              <Link href="/watchlist" className="flex items-center gap-4 px-5 py-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] active:bg-cyan-400/[0.08] transition-all">
                <Bookmark size={26} className="text-cyan-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-sm uppercase tracking-wider text-cyan-400">Watchlist</p>
                </div>
              </Link>
              <Link href="/discover" className="flex items-center gap-4 px-5 py-4 rounded-xl border border-pink-400/20 bg-pink-400/[0.04] active:bg-pink-400/[0.08] transition-all">
                <Radar size={26} className="text-pink-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-sm uppercase tracking-wider text-pink-400">Discover</p>
                </div>
              </Link>
              <Link href="/stats?view=visualise" className="flex items-center gap-4 px-5 py-4 rounded-xl border border-teal-400/20 bg-teal-400/[0.04] active:bg-teal-400/[0.08] transition-all">
                <BarChart3 size={26} className="text-teal-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-sm uppercase tracking-wider text-teal-400">Stats</p>
                </div>
              </Link>
            </div>
          </div>
        ) : (
        <>
        {/* Hero banner */}
        {heroEntry && (
          <div
            className="relative mb-2 cursor-pointer animate-fade-up flex-shrink-0"
            onClick={() => setSelectedEntry(heroEntry)}
          >
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
                <p
                  className="text-[8px] uppercase tracking-[2px] font-semibold mb-0.5"
                  style={{ color: heroEntry.media_type === "movie" ? "#38bdf8" : "#c4b5fd" }}
                >
                  From Your Collection
                </p>
                <h2 className="font-display text-base font-medium text-[#e8e4dc] tracking-wide mb-0.5 truncate">
                  {heroEntry.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="font-mono-stats text-sm text-vr-blue font-bold">
                    {Number(heroEntry.my_rating).toFixed(0)}/10
                  </span>
                  <span className="font-mono-stats text-xs text-[#5c5954]">{heroEntry.year}</span>
                  <span className="text-xs text-[#5c5954] truncate">{heroEntry.genres?.slice(0, 3).join(", ")}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Movies/TV tabs */}
        <div className="flex justify-center mb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <a
              href="/?tab=movie"
              className={`px-6 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${
                isMovie
                  ? "bg-gradient-to-br from-vr-blue to-vr-blue-dark text-white"
                  : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
            >
              🎬 Movies <span className="font-mono-stats text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">{movieCount}</span>
            </a>
            <a
              href="/?tab=tv"
              className={`px-6 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${
                !isMovie
                  ? "bg-gradient-to-br from-vr-violet to-vr-violet-dark text-white"
                  : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
            >
              📺 TV Shows <span className="font-mono-stats text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">{tvCount}</span>
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
              rgb={isMovie ? "14,165,233" : "139,92,246"}
            />
            {topTags.length > 0 && (
              <MobileDropdown
                value={tagFilter || ""}
                options={[{ key: "", label: "All Tags" }, ...topTags.map((t) => ({ key: t, label: t }))]}
                onChange={(v) => setTagFilter(v || null)}
                className="flex-1"
                rgb={isMovie ? "14,165,233" : "139,92,246"}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-[8px] uppercase tracking-wider text-[#5c5954] shrink-0">Sort by:</span>
            <MobileDropdown
              value={sortBy}
              options={SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              onChange={(v) => setSortBy(v as SortKey)}
              rgb={isMovie ? "14,165,233" : "139,92,246"}
            />
            <div className="relative flex-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5954]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-7 rounded-lg border border-border-glow/30 bg-[#0e0e14] pl-8 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Mobile grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">{mobilePosterGrid}</div>
        </>
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
          onEdit={(entry) => setSelectedEntry(entry)}
          isOn={tvOn}
        />
      </div>

      {/* Filter drawer */}
      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        genreFilter={genreFilter}
        setGenreFilter={setGenreFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        availableTags={topTags}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Detail modal */}
      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={(updated) => {
            setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setSelectedEntry(null);
          }}
          onDelete={(id) => {
            setEntries((prev) => prev.filter((e) => e.id !== id));
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Entry Detail / Edit Modal ── */

function EntryDetailModal({
  entry, onClose, onUpdate, onDelete,
}: {
  entry: Entry; onClose: () => void; onUpdate: (updated: Entry) => void; onDelete: (id: string) => void;
}) {
  const [myRating, setMyRating] = useState(Number(entry.my_rating));
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [recommended, setRecommended] = useState(entry.recommended);
  const [rewatch, setRewatch] = useState(entry.rewatch);
  const [seasonsWatched, setSeasonsWatched] = useState(entry.seasons_watched > 0 ? entry.seasons_watched : (entry.media_type === "tv" ? entry.seasons : 0));
  const [yearWatched, setYearWatched] = useState(entry.year_watched || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [yearDropOpen, setYearDropOpen] = useState(false);
  const [seasonDropOpen, setSeasonDropOpen] = useState(false);
  const yearRef = useRef<HTMLDivElement>(null);
  const seasonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearDropOpen(false);
      if (seasonRef.current && !seasonRef.current.contains(e.target as Node)) setSeasonDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isMovie = entry.media_type === "movie";
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

  function ratingColor(val: number): string {
    if (val <= 4) return "#ef4444";
    if (val <= 6) return "#ffb800";
    if (val <= 8) return "#0ea5e9";
    return "#39ff14";
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("entries")
      .update({ my_rating: myRating, tags, recommended, rewatch, seasons_watched: seasonsWatched, year_watched: yearWatched || null })
      .eq("id", entry.id).select().single();
    if (!error && data) onUpdate(data as Entry);
    else onClose();
    setSaving(false);
  }

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("entries").delete().eq("id", entry.id);
    onDelete(entry.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:px-40 lg:py-16">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-modal-backdrop" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border-glow bg-bg-card animate-modal-enter">
        <div className="h-px rounded-t-xl" style={{ background: "linear-gradient(90deg, transparent 5%, #38bdf8 30%, #a78bfa 70%, transparent 95%)" }} />
        <button onClick={onClose} className="absolute top-2.5 right-2.5 z-10 p-1 rounded-lg bg-bg-deep/50 text-[#5c5954] hover:text-[#e8e4dc] transition-colors text-xs">✕</button>

        <div className="p-3">
          {/* Top: poster + info side by side */}
          <div className="flex gap-3 mb-2">
            <div className="flex-shrink-0 w-16 rounded-md overflow-hidden bg-bg-deep">
              {entry.poster ? (
                <img src={posterUrl(entry.poster, "small")} alt={entry.title} className="w-full aspect-[2/3] object-cover" />
              ) : (
                <div className="w-full aspect-[2/3] flex items-center justify-center text-[#5c5954] text-[9px]">No poster</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-1.5 py-px rounded text-[8px] font-display uppercase tracking-wider mb-0.5 ${isMovie ? "bg-vr-blue/15 text-vr-blue" : "bg-vr-violet/15 text-vr-violet"}`}>
                {isMovie ? "Film" : "TV"}
              </span>
              <h2 className="font-display text-sm font-medium text-[#e8e4dc] tracking-wide leading-tight">{entry.title}</h2>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px]">
                <span className="font-mono-stats text-[#5c5954]">{entry.year}</span>
                {isMovie && entry.runtime ? (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-[#5c5954]">{entry.runtime}m</span></>) : null}
                {!isMovie && (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-[#5c5954]">{entry.seasons}S·{entry.episodes}E</span></>)}
                {entry.tmdb_rating && (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-vr-blue/70">TMDB {Number(entry.tmdb_rating).toFixed(1)}</span></>)}
                {entry.imdb_id && (
                  <a href={`https://www.imdb.com/title/${entry.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-vr-blue/50 hover:text-vr-blue transition-colors">IMDb ↗</a>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {entry.genres?.slice(0, 4).map((g) => (
                  <span key={g} className="px-1.5 py-px rounded-full text-[8px] font-display uppercase tracking-wider border border-border-glow text-[#9a968e]">{g}</span>
                ))}
              </div>
            </div>
          </div>

          {entry.overview && <p className="text-[10px] text-[#9a968e] font-body leading-relaxed mb-2 line-clamp-2">{entry.overview}</p>}
          <div className="divider-gradient mb-2" />

          {/* Rating + Year Watched side by side */}
          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <label className="font-display text-[9px] uppercase tracking-wider text-[#9a968e] block mb-1">Your Rating</label>
              <div className="flex items-center gap-2">
                <span className="font-mono-stats text-xl font-bold min-w-[2.5ch] text-center" style={{ color: ratingColor(myRating) }}>{myRating.toFixed(1)}</span>
                <input type="range" min="1" max="10" step="0.5" value={myRating} onChange={(e) => setMyRating(parseFloat(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none bg-bg-deep cursor-pointer accent-vr-blue" />
              </div>
            </div>
            <div className="w-24 shrink-0" ref={yearRef}>
              <label className="font-display text-[9px] uppercase tracking-wider text-[#9a968e] block mb-1">Year Watched</label>
              <div className="relative">
                <button
                  onClick={() => setYearDropOpen(!yearDropOpen)}
                  className="w-full h-7 rounded-md border border-vr-blue/20 bg-[#0e0e14] pl-2 pr-5 font-mono-stats text-[10px] text-vr-blue text-left cursor-pointer hover:bg-bg-deep/70 transition-all"
                  style={{ textShadow: "0 0 6px rgba(14,165,233,0.3)" }}
                >
                  {yearWatched || "—"}
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-vr-blue/50 text-[8px]">{yearDropOpen ? "▲" : "▼"}</span>
                </button>
                {yearDropOpen && (
                  <div className="absolute top-full left-0 mt-1 z-30 w-full max-h-[160px] overflow-y-auto rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter tv-grid-scroll">
                    <button onClick={() => { setYearWatched(""); setYearDropOpen(false); }} className={`w-full text-left px-3 py-1.5 font-mono-stats text-[10px] transition-colors ${!yearWatched ? "text-vr-blue bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"}`}>—</button>
                    {years.map((y) => (
                      <button key={y} onClick={() => { setYearWatched(y); setYearDropOpen(false); }} className={`w-full text-left px-3 py-1.5 font-mono-stats text-[10px] transition-colors ${yearWatched === y ? "text-vr-blue bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"}`} style={yearWatched === y ? { textShadow: "0 0 6px rgba(14,165,233,0.4)" } : undefined}>{y}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isMovie && entry.seasons > 0 && (
            <div className="mb-2">
              <label className="font-display text-[9px] uppercase tracking-wider text-[#9a968e] block mb-1">Seasons Watched <span className="text-[#5c5954] normal-case tracking-normal">({entry.seasons} total)</span></label>
              <div className="relative" ref={seasonRef}>
                <button
                  onClick={() => setSeasonDropOpen(!seasonDropOpen)}
                  className="w-full h-7 rounded-md border border-vr-violet/20 bg-[#0e0e14] pl-2 pr-5 font-mono-stats text-[10px] text-vr-violet text-left cursor-pointer hover:bg-bg-deep/70 transition-all"
                  style={{ textShadow: "0 0 6px rgba(139,92,246,0.3)" }}
                >
                  {seasonsWatched} of {entry.seasons}
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-vr-violet/50 text-[8px]">{seasonDropOpen ? "▲" : "▼"}</span>
                </button>
                {seasonDropOpen && (
                  <div className="absolute top-full left-0 mt-1 z-30 w-full max-h-[120px] overflow-y-auto rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter tv-grid-scroll">
                    {Array.from({ length: entry.seasons }, (_, i) => i + 1).map((s) => (
                      <button key={s} onClick={() => { setSeasonsWatched(s); setSeasonDropOpen(false); }} className={`w-full text-left px-3 py-1.5 font-mono-stats text-[10px] transition-colors ${seasonsWatched === s ? "text-vr-violet bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"}`} style={seasonsWatched === s ? { textShadow: "0 0 6px rgba(139,92,246,0.4)" } : undefined}>{s} of {entry.seasons}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags — compact */}
          <div className="mb-2">
            <label className="font-display text-[9px] uppercase tracking-wider text-[#9a968e] block mb-1">Tags</label>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <button key={tag} onClick={() => setTags(tags.filter((t) => t !== tag))} className="px-2 py-0.5 rounded-full text-[8px] font-display uppercase tracking-wider bg-vr-blue/15 text-vr-blue border border-vr-blue/20 hover:bg-vr-blue/25 transition-colors">{tag} ×</button>
              ))}
              {DEFAULT_TAGS.filter((t) => !tags.includes(t)).slice(0, 8).map((tag) => (
                <button key={tag} onClick={() => setTags([...tags, tag])} className="px-2 py-0.5 rounded-full text-[8px] font-display uppercase tracking-wider border border-border-glow text-[#5c5954] hover:border-vr-blue/30 hover:text-vr-blue transition-colors">{tag}</button>
              ))}
            </div>
          </div>

          {/* Checkboxes + Actions in one row */}
          <div className="flex items-center gap-3 pt-2 border-t border-border-glow/30">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={recommended} onChange={(e) => setRecommended(e.target.checked)} className="sr-only" />
              <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center text-[8px] ${recommended ? "bg-vr-violet/20 border-vr-violet/40" : "border-border-glow bg-bg-deep/50"}`}>
                {recommended && "⭐"}
              </div>
              <span className="font-display text-[9px] uppercase tracking-wider text-[#9a968e]">Fav</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} className="sr-only" />
              <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center text-[8px] ${rewatch ? "bg-vr-blue/20 border-vr-blue/40" : "border-border-glow bg-bg-deep/50"}`}>
                {rewatch && "🔁"}
              </div>
              <span className="font-display text-[9px] uppercase tracking-wider text-[#9a968e]">Rewatch</span>
            </label>
            <div className="flex-1" />
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="px-2.5 h-7 rounded-md border border-red-500/20 text-red-400/60 font-display text-[9px] uppercase tracking-wider hover:bg-red-500/10 hover:text-red-400 transition-colors">Remove</button>
            ) : (
              <button onClick={handleDelete} className="px-2.5 h-7 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 font-display text-[9px] uppercase tracking-wider">Confirm</button>
            )}
            <button onClick={handleSave} disabled={saving} className="px-4 h-7 rounded-md font-display text-[9px] uppercase tracking-wider text-white disabled:opacity-50 hover:shadow-[0_0_12px_rgba(14,165,233,0.3)] transition-all" style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}>
              {saving ? "..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
