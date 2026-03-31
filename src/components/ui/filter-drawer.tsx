"use client";

import { X } from "lucide-react";
import { MAJOR_GENRES } from "@/lib/types";

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  genreFilter: string | null;
  setGenreFilter: (g: string | null) => void;
  tagFilter: string | null;
  setTagFilter: (t: string | null) => void;
  availableTags: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export function FilterDrawer({
  open,
  onClose,
  genreFilter,
  setGenreFilter,
  tagFilter,
  setTagFilter,
  availableTags,
  searchQuery,
  setSearchQuery,
}: FilterDrawerProps) {
  if (!open) return null;

  const activeCount = (genreFilter ? 1 : 0) + (tagFilter ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl bg-[#0e0e14] border border-border-glow/30 shadow-2xl animate-drawer-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border-glow/20 bg-[#0e0e14]">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm uppercase tracking-wider text-[#e8e4dc]">Filters</h3>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono-stats bg-vr-blue/15 text-vr-blue">
                {activeCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#5c5954] hover:text-[#e8e4dc] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Genre */}
          <div>
            <label className="font-display text-[10px] uppercase tracking-[0.15em] text-[#5c5954] block mb-2">
              Genre
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setGenreFilter(null)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider border transition-all ${
                  !genreFilter
                    ? "text-vr-blue border-vr-blue/30 bg-vr-blue/10"
                    : "text-[#5c5954] border-border-glow/30 hover:text-[#9a968e]"
                }`}
              >
                All
              </button>
              {MAJOR_GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider border transition-all ${
                    genreFilter === g
                      ? "text-vr-blue border-vr-blue/30 bg-vr-blue/10"
                      : "text-[#5c5954] border-border-glow/30 hover:text-[#9a968e]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="font-display text-[10px] uppercase tracking-[0.15em] text-[#5c5954] block mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTagFilter(null)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider border transition-all ${
                    !tagFilter
                      ? "text-vr-violet border-vr-violet/30 bg-vr-violet/10"
                      : "text-[#5c5954] border-border-glow/30 hover:text-[#9a968e]"
                  }`}
                >
                  All
                </button>
                {availableTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagFilter(tagFilter === t ? null : t)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider border transition-all ${
                      tagFilter === t
                        ? "text-vr-violet border-vr-violet/30 bg-vr-violet/10"
                        : "text-[#5c5954] border-border-glow/30 hover:text-[#9a968e]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between p-4 border-t border-border-glow/20 bg-[#0e0e14]">
          <button
            onClick={() => {
              setGenreFilter(null);
              setTagFilter(null);
              setSearchQuery("");
            }}
            className="font-display text-[10px] uppercase tracking-wider text-[#5c5954] hover:text-[#9a968e] transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-display text-[11px] uppercase tracking-wider text-white bg-gradient-to-r from-vr-blue to-vr-blue-dark hover:shadow-[0_0_15px_rgba(14,165,233,0.2)] transition-all"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
