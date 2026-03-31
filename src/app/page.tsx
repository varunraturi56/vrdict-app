"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Library as LibraryIcon, Search, ChevronDown } from "lucide-react";
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

const ITEMS_PER_PAGE = 8;

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
  const [flow, setFlow] = useState<FlowState>({ stage: "welcome" });

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

  const mediaEntries = useMemo(
    () => entries.filter((e) => e.media_type === mediaTab),
    [entries, mediaTab]
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
      setFlow({ stage: "welcome" });
    } else if (index === 1) {
      setFlow({ stage: "category", area: "Library" });
    }
    // index 2 = current filter, just clear it
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
            onBack={() => setFlow({ stage: "welcome" })}
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
              currentPage={currentPage}
              totalPages={totalPages}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

            {/* Paginated poster grid — spacious 2×4 layout */}
            <div className="flex-1 flex items-center justify-center px-8 py-4">
              {pagedEntries.length > 0 ? (
                <div className="poster-grid grid grid-cols-4 gap-3 w-full max-w-[700px]">
                  {pagedEntries.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="poster-card relative overflow-hidden bg-bg-deep cursor-pointer animate-slide-in rounded-lg"
                      style={{ animationDelay: `${Math.min(i * 40, 300)}ms`, border: "1px solid rgba(255,255,255,0.05)" }}
                      onClick={() => setSelectedEntry(entry)}
                      onMouseEnter={() => handleMouseEnter(entry)}
                    >
                      <div className="aspect-[2/3]">
                        {entry.poster ? (
                          <img
                            src={posterUrl(entry.poster, "medium")}
                            alt={entry.title}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-[9px] font-display p-2 text-center bg-bg-card rounded-lg">
                            {entry.title}
                          </div>
                        )}
                      </div>
                      {entry.recommended && (
                        <div className="absolute top-1 left-1 text-[10px] drop-shadow-lg">⭐</div>
                      )}
                      {/* Title overlay at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 px-2 rounded-b-lg">
                        <p className="font-display text-[10px] text-white leading-tight truncate">{entry.title}</p>
                        <p className="font-mono-stats text-[9px] text-vr-blue font-bold">{entry.my_rating}/10</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <LibraryIcon size={28} className="text-[#5c5954]/20 mx-auto mb-3" />
                  <p className="font-body text-sm text-[#5c5954]">
                    {entries.length === 0
                      ? "Your collection is empty."
                      : "No matches for your filters."}
                  </p>
                </div>
              )}
            </div>
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
                src={posterUrl(entry.poster, "small")}
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
            {topTags.length > 0 && (
              <div className="relative flex-1">
                <select
                  value={tagFilter || ""}
                  onChange={(e) => setTagFilter(e.target.value || null)}
                  className="appearance-none w-full h-7 pl-3 pr-7 rounded-[20px] border border-border-glow bg-bg-3 font-display text-[10px] uppercase tracking-wider text-[#e8e4dc] focus:outline-none focus:border-vr-blue/30 cursor-pointer"
                >
                  <option value="">All Tags</option>
                  {topTags.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5c5954] pointer-events-none" />
              </div>
            )}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-7 rounded-[20px] border border-border-glow bg-[rgba(12,12,16,0.85)] pl-8 pr-3 font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/30"
              />
            </div>
          </div>
        </div>

        {/* Mobile grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">{mobilePosterGrid}</div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[calc(100vh-120px)] overflow-y-auto overflow-x-hidden rounded-xl border border-border-glow bg-bg-card animate-slide-in">
        <div className="h-px rounded-t-xl" style={{ background: "linear-gradient(90deg, transparent 5%, #38bdf8 30%, #a78bfa 70%, transparent 95%)" }} />
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-bg-deep/50 text-[#5c5954] hover:text-[#e8e4dc] transition-colors">✕</button>

        <div className="p-3 md:p-5">
          <div className="flex gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="flex-shrink-0 w-20 md:w-28 max-h-[120px] md:max-h-none rounded-lg overflow-hidden bg-bg-deep">
              {entry.poster ? (
                <img src={posterUrl(entry.poster, "medium")} alt={entry.title} className="w-full aspect-[2/3] object-cover" />
              ) : (
                <div className="w-full aspect-[2/3] flex items-center justify-center text-[#5c5954] text-xs">No poster</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider mb-1 ${isMovie ? "bg-vr-blue/15 text-vr-blue" : "bg-vr-violet/15 text-vr-violet"}`}>
                {isMovie ? "Film" : "TV"}
              </span>
              <h2 className="font-display text-lg font-medium text-[#e8e4dc] tracking-wide leading-tight">{entry.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono-stats text-xs text-[#5c5954]">{entry.year}</span>
                {isMovie && entry.runtime ? (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-xs text-[#5c5954]">{entry.runtime} min</span></>) : null}
                {!isMovie && (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-xs text-[#5c5954]">{entry.seasons}S · {entry.episodes}E</span></>)}
                {entry.tmdb_rating && (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-xs text-vr-blue/70">TMDB {Number(entry.tmdb_rating).toFixed(1)}</span></>)}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {entry.genres?.map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider border border-border-glow text-[#9a968e]">{g}</span>
                ))}
              </div>
              {entry.imdb_id && (
                <a href={`https://www.imdb.com/title/${entry.imdb_id}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[10px] font-display uppercase tracking-wider text-vr-blue/50 hover:text-vr-blue transition-colors">IMDb ↗</a>
              )}
            </div>
          </div>

          {entry.overview && <p className="text-xs text-[#9a968e] font-body leading-relaxed mb-3 md:mb-4 line-clamp-3">{entry.overview}</p>}
          <div className="divider-gradient mb-3 md:mb-4" />

          <div className="mb-3 md:mb-4">
            <label className="font-display text-[11px] uppercase tracking-wider text-[#9a968e] block mb-2">Your Rating</label>
            <div className="flex items-center gap-4">
              <span className="font-mono-stats text-3xl font-bold min-w-[3ch] text-center" style={{ color: ratingColor(myRating) }}>{myRating.toFixed(1)}</span>
              <input type="range" min="1" max="10" step="0.5" value={myRating} onChange={(e) => setMyRating(parseFloat(e.target.value))} className="flex-1 h-2 rounded-full appearance-none bg-bg-deep cursor-pointer accent-vr-blue" />
            </div>
          </div>

          <div className="mb-3 md:mb-4">
            <label className="font-display text-[11px] uppercase tracking-wider text-[#9a968e] block mb-2">Year Watched</label>
            <select value={yearWatched} onChange={(e) => setYearWatched(e.target.value)} className="w-full h-10 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-mono-stats text-xs text-[#e8e4dc] focus:outline-none focus:border-vr-blue/40">
              <option value="">—</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {!isMovie && entry.seasons > 0 && (
            <div className="mb-3 md:mb-4">
              <label className="font-display text-[11px] uppercase tracking-wider text-[#9a968e] block mb-2">
                Seasons Watched
                <span className="text-[#5c5954] ml-1 normal-case tracking-normal">({entry.seasons} total)</span>
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={seasonsWatched}
                  onChange={(e) => setSeasonsWatched(Number(e.target.value))}
                  className="w-full h-10 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-mono-stats text-xs text-[#e8e4dc] focus:outline-none focus:border-vr-violet/40"
                >
                  {Array.from({ length: entry.seasons }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      {s} of {entry.seasons} season{s !== 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mb-3 md:mb-4">
            <label className="font-display text-[11px] uppercase tracking-wider text-[#9a968e] block mb-2">Tags</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <button key={tag} onClick={() => setTags(tags.filter((t) => t !== tag))} className="px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider bg-vr-blue/15 text-vr-blue border border-vr-blue/20 hover:bg-vr-blue/25 transition-colors">{tag} ×</button>
                ))}
              </div>
            )}
            <div className="hidden md:block">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]); setTagInput(""); } }} placeholder="Type a custom tag..." className="w-full h-9 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-body text-xs text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/40 mb-2" />
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TAGS.filter((t) => !tags.includes(t)).slice(0, 12).map((tag) => (
                  <button key={tag} onClick={() => setTags([...tags, tag])} className="px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider border border-border-glow text-[#9a968e] bg-bg-deep/50 hover:border-vr-blue/30 hover:text-vr-blue hover:bg-vr-blue/10 transition-colors">{tag}</button>
                ))}
              </div>
            </div>
            <div className="md:hidden">
              <select
                value=""
                onChange={(e) => { if (e.target.value && !tags.includes(e.target.value)) setTags([...tags, e.target.value]); }}
                className="w-full h-9 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-body text-xs text-[#e8e4dc] focus:outline-none focus:border-vr-blue/40 mb-2 appearance-none"
              >
                <option value="">Add a tag...</option>
                {DEFAULT_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]); setTagInput(""); } }} placeholder="Or type a custom tag..." className="w-full h-9 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-body text-xs text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/40" />
            </div>
          </div>

          <div className="flex gap-4 mb-3 md:mb-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={recommended} onChange={(e) => setRecommended(e.target.checked)} className="sr-only" />
              <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${recommended ? "bg-vr-violet/20 border-vr-violet/40" : "border-border-glow bg-bg-deep/50"}`}>
                {recommended && <span className="text-[10px]">⭐</span>}
              </div>
              <span className="font-display text-[11px] uppercase tracking-wider text-[#9a968e]">Favourite</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} className="sr-only" />
              <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${rewatch ? "bg-vr-blue/20 border-vr-blue/40" : "border-border-glow bg-bg-deep/50"}`}>
                {rewatch && <span className="text-[10px]">🔁</span>}
              </div>
              <span className="font-display text-[11px] uppercase tracking-wider text-[#9a968e]">Rewatch</span>
            </label>
          </div>

          <div className="sticky bottom-0 z-10 flex gap-3 pt-3 border-t border-border-glow bg-bg-card -mx-3 px-3 md:-mx-5 md:px-5 pb-3 md:pb-0 md:relative md:border-t-0 md:pt-0 md:bg-transparent">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="px-4 h-11 rounded-lg border border-red-500/20 text-red-400/60 font-display text-sm uppercase tracking-wider hover:bg-red-500/10 hover:text-red-400 transition-colors">Remove</button>
            ) : (
              <button onClick={handleDelete} className="px-4 h-11 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-display text-sm uppercase tracking-wider">Confirm Delete</button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} className="px-4 h-11 rounded-lg border border-border-glow font-display text-sm uppercase tracking-wider text-[#5c5954] hover:text-[#9a968e] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-6 h-11 rounded-lg font-display text-sm uppercase tracking-wider text-white disabled:opacity-50 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all" style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}>
              {saving ? "..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
