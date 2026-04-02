"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useEntries } from "@/lib/entries-context";
import type { Entry } from "@/lib/types";
import { useLibraryCounts } from "@/lib/library-context";
import { useHeroRotation } from "@/hooks/use-hero-rotation";
import { usePagination } from "@/hooks/use-pagination";
import { useLibraryFlow } from "@/hooks/use-library-flow";
import { useLibraryFilters } from "@/hooks/use-library-filters";
import { LibraryDesktopView } from "@/components/library/desktop-view";
import { LibraryMobileView } from "@/components/library/mobile-view";
import { EntryDetailModal } from "@/components/entry-detail-modal";
import { FilterDrawer } from "@/components/ui/filter-drawer";

const ITEMS_PER_PAGE = 14;

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  );
}

function LibraryContent() {
  const { entries, loading, updateEntry: ctxUpdateEntry, removeEntry: ctxRemoveEntry } = useEntries();
  const { setCounts } = useLibraryCounts();

  // Flow state (welcome / category / results)
  const {
    flow, mediaTab, hasTab, activeMediaType, searchParams,
    handleWelcomeNavigate, handleCategorySelect, handleBackToCategory, handleBackToWelcome,
  } = useLibraryFlow();

  // Filter/sort/search state
  const filters = useLibraryFilters(entries, activeMediaType, mediaTab);

  // Pagination (desktop only — mobile scrolls all)
  const { currentPage, setCurrentPage, totalPages, pagedItems: pagedEntries } =
    usePagination(filters.filteredEntries, ITEMS_PER_PAGE, [filters.genreFilter, filters.tagFilter, filters.searchQuery, filters.sortBy]);

  // Hero rotation (mobile only)
  const heroFilter = useMemo(() => (e: Entry) => e.my_rating >= 7 && !!e.poster, []);
  const heroEntry = useHeroRotation(filters.mediaEntries, heroFilter);

  // UI state
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // Publish counts to global context
  const movieCount = entries.filter((e) => e.media_type === "movie").length;
  const tvCount = entries.filter((e) => e.media_type === "tv").length;
  const favCount = entries.filter((e) => e.recommended).length;

  useEffect(() => {
    setCounts({ movieCount, tvCount });
  }, [movieCount, tvCount, setCounts]);

  // Reset pagination on tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [mediaTab, setCurrentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
      </div>
    );
  }

  const isMobileHome = !hasTab && !searchParams.get("view");

  return (
    <div className="px-4 pt-1 pb-0 flex flex-col flex-1 min-h-0 overflow-hidden lg:px-5 lg:pt-3 lg:pb-0 lg:overflow-hidden">

      {/* ═══ MOBILE ═══ */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        <LibraryMobileView
          isHome={isMobileHome}
          entries={entries}
          filteredEntries={filters.filteredEntries}
          heroEntry={heroEntry}
          movieCount={movieCount}
          tvCount={tvCount}
          favCount={favCount}
          mediaTab={mediaTab}
          genreFilter={filters.genreFilter}
          tagFilter={filters.tagFilter}
          searchQuery={filters.searchQuery}
          sortBy={filters.sortBy}
          topTags={filters.topTags}
          setGenreFilter={filters.setGenreFilter}
          setTagFilter={filters.setTagFilter}
          setSearchQuery={filters.setSearchQuery}
          setSortBy={filters.setSortBy}
          onSelectEntry={setSelectedEntry}
        />
      </div>

      {/* ═══ DESKTOP ═══ */}
      <LibraryDesktopView
        flow={flow}
        entries={entries}
        filteredEntries={filters.filteredEntries}
        pagedEntries={pagedEntries}
        movieCount={movieCount}
        tvCount={tvCount}
        favCount={favCount}
        mediaTab={mediaTab}
        genreFilter={filters.genreFilter}
        tagFilter={filters.tagFilter}
        searchQuery={filters.searchQuery}
        sortBy={filters.sortBy}
        currentPage={currentPage}
        totalPages={totalPages}
        activeFilterCount={filters.activeFilterCount}
        setGenreFilter={filters.setGenreFilter}
        setTagFilter={filters.setTagFilter}
        setSearchQuery={filters.setSearchQuery}
        setSortBy={filters.setSortBy}
        setCurrentPage={setCurrentPage}
        clearFilters={filters.clearFilters}
        onFilterOpen={() => setFilterOpen(true)}
        onWelcomeNavigate={handleWelcomeNavigate}
        onCategorySelect={handleCategorySelect}
        onBackToCategory={handleBackToCategory}
        onBackToWelcome={handleBackToWelcome}
        onSelectEntry={setSelectedEntry}
      />

      {/* Filter drawer */}
      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        genreFilter={filters.genreFilter}
        setGenreFilter={filters.setGenreFilter}
        tagFilter={filters.tagFilter}
        setTagFilter={filters.setTagFilter}
        availableTags={filters.topTags}
        searchQuery={filters.searchQuery}
        setSearchQuery={filters.setSearchQuery}
      />

      {/* Detail modal */}
      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={(updated) => {
            ctxUpdateEntry(updated);
            setSelectedEntry(null);
          }}
          onDelete={(id) => {
            ctxRemoveEntry(id);
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}
