"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, SlidersHorizontal, Search, RotateCcw } from "lucide-react";

interface BreadcrumbBarProps {
  path: string[];
  onPathClick: (index: number) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  sortOptions: { key: string; label: string }[];
  onFilterOpen: () => void;
  activeFilterCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onClearFilters?: () => void;
  accentColor?: "blue" | "violet";
}

export function BreadcrumbBar({
  path,
  onPathClick,
  sortBy,
  setSortBy,
  sortOptions,
  onFilterOpen,
  activeFilterCount,
  searchQuery,
  setSearchQuery,
  onClearFilters,
  accentColor = "blue",
}: BreadcrumbBarProps) {
  const isViolet = accentColor === "violet";
  const accentText = isViolet ? "text-vr-violet" : "text-vr-blue";
  const accentBorder = isViolet ? "border-vr-violet/20 focus:border-vr-violet/40" : "border-vr-blue/20 focus:border-vr-blue/40";
  const accentHover = isViolet ? "hover:border-vr-violet/40 hover:text-vr-violet" : "hover:border-vr-blue/40 hover:text-vr-blue";
  const badgeBg = isViolet ? "bg-vr-violet/20 text-vr-violet" : "bg-vr-blue/20 text-vr-blue";
  const rgb = isViolet ? "139,92,246" : "14,165,233";

  // Custom sort dropdown
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentSortLabel = sortOptions.find((o) => o.key === sortBy)?.label || "Rating";

  return (
    <div className="flex items-center justify-between px-4 lg:px-6 py-2 border-b border-border-glow/15">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-1 min-w-0">
        {path.map((segment, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={12} className="text-[#5c5954]/40 shrink-0" />}
            <button
              onClick={() => onPathClick(i)}
              className={`font-display text-[11px] uppercase tracking-wider transition-colors truncate ${
                i === path.length - 1
                  ? accentText
                  : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
            >
              {segment}
            </button>
          </span>
        ))}
      </div>

      {/* Right: Search + Sort + Clear + Filter */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search — wider */}
        <div className="relative">
          <Search size={11} className={`absolute left-2 top-1/2 -translate-y-1/2 ${accentText} opacity-50`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles..."
            className={`h-7 w-56 pl-6 pr-2 rounded-lg border ${accentBorder} bg-transparent font-body text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none`}
          />
        </div>

        {/* Sort — custom dropdown popup */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className={`flex items-center gap-1 h-7 px-2.5 rounded-lg border ${accentBorder} bg-bg-deep/40 ${accentText} transition-all hover:bg-bg-deep/70`}
            style={{ textShadow: `0 0 6px rgba(${rgb},0.3)` }}
          >
            <span className="font-display text-[9px] uppercase tracking-wider text-[#5c5954]">Sort by:</span>
            <span className="font-display text-[10px] uppercase tracking-wider">{currentSortLabel}</span>
            <ChevronRight size={10} className={`${sortOpen ? "-rotate-90" : "rotate-90"} transition-transform duration-200 opacity-50`} />
          </button>
          {sortOpen && (
            <div className="absolute top-full right-0 mt-1 z-20 min-w-[120px] rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter overflow-hidden">
              {sortOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-2 font-display text-[10px] uppercase tracking-wider transition-colors ${
                    sortBy === opt.key
                      ? `${accentText} bg-bg-deep/60`
                      : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"
                  }`}
                  style={sortBy === opt.key ? { textShadow: `0 0 6px rgba(${rgb},0.4)` } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={onFilterOpen}
          className={`flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border-glow/20 text-[#5c5954] ${accentHover} transition-colors`}
        >
          <SlidersHorizontal size={12} />
          <span className="font-display text-[10px] uppercase tracking-wider">Filter</span>
          {activeFilterCount > 0 && (
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono-stats ${badgeBg}`}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Clear filters — circular arrow, after filter button */}
        {(activeFilterCount > 0 || searchQuery) && onClearFilters && (
          <button
            onClick={onClearFilters}
            className={`w-7 h-7 rounded-full flex items-center justify-center border border-border-glow/20 ${accentText} ${accentHover} transition-all hover:rotate-[-180deg] duration-300`}
            title="Clear all filters"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
