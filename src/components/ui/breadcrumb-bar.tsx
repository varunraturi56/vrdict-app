"use client";

import { ChevronRight, SlidersHorizontal, ChevronLeft as ArrowLeft, ChevronRight as ArrowRight } from "lucide-react";

interface BreadcrumbBarProps {
  path: string[];
  onPathClick: (index: number) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  sortOptions: { key: string; label: string }[];
  onFilterOpen: () => void;
  activeFilterCount: number;
  // Pagination
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function BreadcrumbBar({
  path,
  onPathClick,
  sortBy,
  setSortBy,
  sortOptions,
  onFilterOpen,
  activeFilterCount,
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: BreadcrumbBarProps) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6 py-2.5 border-b border-border-glow/15">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-1 min-w-0">
        {path.map((segment, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={12} className="text-[#5c5954]/40 shrink-0" />}
            <button
              onClick={() => onPathClick(i)}
              className={`font-display text-[11px] uppercase tracking-wider transition-colors truncate ${
                i === path.length - 1
                  ? "text-vr-blue"
                  : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
            >
              {segment}
            </button>
          </span>
        ))}
      </div>

      {/* Right: Sort + Filter + Pagination */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-7 px-2 rounded-lg border border-border-glow/20 bg-transparent font-display text-[10px] uppercase tracking-wider text-[#5c5954] focus:outline-none focus:border-vr-blue/30 cursor-pointer"
        >
          {sortOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        {/* Filter button */}
        <button
          onClick={onFilterOpen}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border-glow/20 text-[#5c5954] hover:text-[#9a968e] hover:border-border-glow/40 transition-colors"
        >
          <SlidersHorizontal size={12} />
          <span className="font-display text-[10px] uppercase tracking-wider">Filter</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono-stats bg-vr-blue/20 text-vr-blue">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={onPrev}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-lg border border-border-glow/20 flex items-center justify-center text-[#5c5954] hover:text-[#9a968e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={14} />
            </button>
            <span className="font-mono-stats text-[10px] text-[#5c5954] min-w-[40px] text-center">
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={onNext}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded-lg border border-border-glow/20 flex items-center justify-center text-[#5c5954] hover:text-[#9a968e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
