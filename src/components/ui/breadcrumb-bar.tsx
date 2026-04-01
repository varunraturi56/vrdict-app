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
  /** Custom RGB override — e.g. "255,184,0". Takes precedence over accentColor */
  accentRgb?: string;
  /** Custom placeholder for the search input */
  searchPlaceholder?: string;
}

// Named presets
const PRESETS: Record<string, string> = {
  blue: "14,165,233",
  violet: "139,92,246",
};

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
  accentRgb,
  searchPlaceholder = "Search titles...",
}: BreadcrumbBarProps) {
  const rgb = accentRgb || PRESETS[accentColor] || PRESETS.blue;

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

  // Dynamic styles from RGB
  const accentStyle = { color: `rgb(${rgb})` };
  const accentGlow = { color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.3)` };
  const borderStyle = `rgba(${rgb},0.2)`;
  const borderFocusStyle = `rgba(${rgb},0.4)`;

  return (
    <div className="flex items-center justify-between gap-2 px-2 xl:px-6 py-1.5 xl:py-2 border-b border-border-glow/15">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-1 min-w-0 shrink-0">
        {path.map((segment, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={12} className="text-[#5c5954]/40 shrink-0" />}
            <button
              onClick={() => onPathClick(i)}
              className={`font-display text-[10px] xl:text-[11px] uppercase tracking-wider transition-colors truncate ${
                i === path.length - 1
                  ? ""
                  : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
              style={i === path.length - 1 ? accentStyle : undefined}
            >
              {segment}
            </button>
          </span>
        ))}
      </div>

      {/* Right: Search + Sort + Clear + Filter */}
      <div className="flex items-center gap-1 xl:gap-2 min-w-0">
        {/* Search */}
        <div className="relative min-w-0 flex-1 max-w-[140px] xl:max-w-[220px]">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" style={accentStyle} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-6 xl:h-7 w-full pl-6 pr-2 rounded-lg bg-transparent font-body text-[9px] xl:text-[10px] text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none"
            style={{ border: `1px solid ${borderStyle}` }}
            onFocus={(e) => { e.currentTarget.style.borderColor = borderFocusStyle; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = borderStyle; }}
          />
        </div>

        {/* Sort — custom dropdown popup */}
        <div className="relative shrink-0" ref={sortRef}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-0.5 xl:gap-1 h-6 xl:h-7 px-1.5 xl:px-2.5 rounded-lg bg-bg-deep/40 transition-all hover:bg-bg-deep/70"
            style={{ border: `1px solid ${borderStyle}`, ...accentGlow }}
          >
            <span className="font-display text-[8px] xl:text-[9px] uppercase tracking-wider text-[#5c5954] hidden xl:inline">Sort by:</span>
            <span className="font-display text-[9px] xl:text-[10px] uppercase tracking-wider">{currentSortLabel}</span>
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

        {/* Filter button — badge always takes space to prevent layout shift */}
        <button
          onClick={onFilterOpen}
          className="flex items-center gap-0.5 xl:gap-1 h-6 xl:h-7 px-1.5 xl:px-2.5 rounded-lg border border-border-glow/20 text-[#5c5954] transition-colors shrink-0"
          style={{ ["--hover-color" as any]: `rgb(${rgb})` }}
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

        {/* Clear filters — always rendered, visibility toggled to prevent layout shift */}
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className={`w-6 h-6 xl:w-7 xl:h-7 rounded-full flex items-center justify-center border border-border-glow/20 transition-all hover:rotate-[-180deg] duration-300 shrink-0 ${(activeFilterCount > 0 || searchQuery) ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            style={accentStyle}
            title="Clear all filters"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
