"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Library as LibraryIcon, ChevronDown } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import type { Entry } from "@/lib/types";
import { TvFrame } from "@/components/ui/tv-frame";
import { LedBars } from "@/components/ui/led-bar";
import { PreviewBar } from "@/components/ui/preview-bar";
import { TvWelcome } from "@/components/ui/tv-welcome";
import { TvCategorySelect } from "@/components/ui/tv-category-select";
import { BreadcrumbBar } from "@/components/ui/breadcrumb-bar";
import type { FlowState } from "@/hooks/use-library-flow";
import type { SortKey } from "@/hooks/use-library-filters";
import { SORT_OPTIONS } from "@/hooks/use-library-filters";

interface DesktopViewProps {
  flow: FlowState;
  entries: Entry[];
  filteredEntries: Entry[];
  pagedEntries: Entry[];
  movieCount: number;
  tvCount: number;
  favCount: number;
  mediaTab: string;
  genreFilter: string | null;
  tagFilter: string | null;
  searchQuery: string;
  sortBy: SortKey;
  currentPage: number;
  totalPages: number;
  activeFilterCount: number;
  setGenreFilter: (v: string | null) => void;
  setTagFilter: (v: string | null) => void;
  setSearchQuery: (v: string) => void;
  setSortBy: (v: SortKey) => void;
  setCurrentPage: (v: number | ((p: number) => number)) => void;
  clearFilters: () => void;
  onFilterOpen: () => void;
  onWelcomeNavigate: (area: "library" | "favourites" | "watchlist" | "discover" | "stats") => void;
  onCategorySelect: (mediaType: "movie" | "tv") => void;
  onBackToCategory: () => void;
  onBackToWelcome: () => void;
  onSelectEntry: (entry: Entry) => void;
}

export function LibraryDesktopView(props: DesktopViewProps) {
  const {
    flow, entries, filteredEntries, pagedEntries,
    movieCount, tvCount, favCount, mediaTab,
    genreFilter, tagFilter, searchQuery, sortBy,
    currentPage, totalPages, activeFilterCount,
    setGenreFilter, setTagFilter, setSearchQuery, setSortBy, setCurrentPage,
    clearFilters, onFilterOpen,
    onWelcomeNavigate, onCategorySelect, onBackToCategory, onBackToWelcome,
    onSelectEntry,
  } = props;

  const router = useRouter();
  const [tvOn, setTvOn] = useState(true);
  const [peekedEntry, setPeekedEntry] = useState<Entry | null>(null);

  const isMovie = mediaTab === "movie";
  const displayEntry = peekedEntry || filteredEntries.find((e) => e.my_rating >= 7 && e.poster) || filteredEntries[0] || null;

  const breadcrumbPath = flow.stage === "results"
    ? ["Library", mediaTab === "movie" ? "Movies" : "TV Shows", ...(genreFilter ? [genreFilter] : [])]
    : [];

  function handleBreadcrumbClick(index: number) {
    if (index === 0) onBackToCategory();
    if (index <= 1) clearFilters();
  }

  // ─── TV content based on flow state ───
  const tvContent = (() => {
    switch (flow.stage) {
      case "welcome":
        return <TvWelcome onNavigate={onWelcomeNavigate} />;

      case "category":
        return (
          <TvCategorySelect
            area={flow.area}
            movieCount={movieCount}
            tvCount={tvCount}
            favCount={favCount}
            onSelect={onCategorySelect}
            onBack={onBackToWelcome}
            onFavourites={() => router.push("/favourites")}
          />
        );

      case "results":
        return (
          <div className="flex flex-col flex-1 min-h-0">
            <BreadcrumbBar
              path={breadcrumbPath}
              onPathClick={handleBreadcrumbClick}
              sortBy={sortBy}
              setSortBy={(s) => setSortBy(s as SortKey)}
              sortOptions={SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              onFilterOpen={onFilterOpen}
              activeFilterCount={activeFilterCount}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onClearFilters={clearFilters}
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

            {/* Paginated poster grid */}
            <PaginatedGrid
              entries={pagedEntries}
              isEmpty={entries.length === 0}
              isMovie={isMovie}
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              onSelectEntry={onSelectEntry}
              onMouseEnter={setPeekedEntry}
            />
          </div>
        );
    }
  })();

  return (
    <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 relative">
      <LedBars />
      <TvFrame isOn={tvOn} onPowerToggle={() => setTvOn(!tvOn)}>
        {tvContent}
      </TvFrame>
      <div className="hidden lg:block px-32">
        <div className="tv-stand">
          <div className="tv-stand-neck" />
          <div className="tv-stand-base" />
        </div>
      </div>
      <PreviewBar
        entry={flow.stage === "results" ? displayEntry : null}
        onEdit={onSelectEntry}
        isOn={tvOn}
      />
    </div>
  );
}

// ─── Poster grid with pagination arrows ───

function PaginatedGrid({
  entries, isEmpty, isMovie, currentPage, totalPages, setCurrentPage, onSelectEntry, onMouseEnter,
}: {
  entries: Entry[];
  isEmpty: boolean;
  isMovie: boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (v: number | ((p: number) => number)) => void;
  onSelectEntry: (e: Entry) => void;
  onMouseEnter: (e: Entry) => void;
}) {
  const rgb = isMovie ? "14,165,233" : "139,92,246";
  const tabColor = isMovie ? "text-vr-blue" : "text-vr-violet";

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-1 py-2">
      <div className="flex items-center w-full flex-1 min-h-0" style={{ containerType: 'size' }}>
        {/* Left arrow */}
        <button
          onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={`shrink-0 w-10 h-full flex items-center justify-center ${tabColor} disabled:opacity-10 disabled:cursor-not-allowed transition-all group`}
        >
          <ChevronDown
            size={44}
            className="rotate-90 transition-all duration-300 group-hover:scale-125"
            style={{ filter: currentPage === 1 ? "none" : `drop-shadow(0 0 8px rgba(${rgb},0.6)) drop-shadow(0 0 20px rgba(${rgb},0.3))` }}
          />
        </button>

        {entries.length > 0 ? (
          <div className="poster-grid grid grid-cols-7 gap-1.5 flex-1 h-full content-center mx-auto" style={{ maxWidth: 'calc(700cqh / 3 + 22px)' }}>
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className="poster-card relative overflow-hidden bg-bg-deep cursor-pointer animate-slide-in rounded-md aspect-[2/3]"
                style={{ animationDelay: `${Math.min(i * 20, 250)}ms`, border: "1px solid rgba(255,255,255,0.05)", maxHeight: 'calc(50cqh - 3px)' }}
                onClick={() => onSelectEntry(entry)}
                onMouseEnter={() => onMouseEnter(entry)}
              >
                <div className="h-full">
                  {entry.poster ? (
                    <img src={posterUrl(entry.poster, "medium")} alt={entry.title} className="w-full h-full object-cover rounded-md" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-[8px] font-display p-1 text-center bg-bg-card rounded-md">{entry.title}</div>
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
                {isEmpty ? "Your collection is empty." : "No matches for your filters."}
              </p>
            </div>
          </div>
        )}

        {/* Right arrow */}
        <button
          onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className={`shrink-0 w-10 h-full flex items-center justify-center ${tabColor} disabled:opacity-10 disabled:cursor-not-allowed transition-all group`}
        >
          <ChevronDown
            size={44}
            className="-rotate-90 transition-all duration-300 group-hover:scale-125"
            style={{ filter: currentPage === totalPages ? "none" : `drop-shadow(0 0 8px rgba(${rgb},0.6)) drop-shadow(0 0 20px rgba(${rgb},0.3))` }}
          />
        </button>
      </div>

      {/* Page indicator */}
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
}
