"use client";

import Link from "next/link";
import { Library as LibraryIcon, Star, Bookmark, Radar, BarChart3, Search } from "lucide-react";
import { MobileDropdown } from "@/components/ui/mobile-dropdown";
import { posterUrl } from "@/lib/tmdb";
import { MAJOR_GENRES, type Entry } from "@/lib/types";
import type { SortKey } from "@/hooks/use-library-filters";
import { SORT_OPTIONS } from "@/hooks/use-library-filters";

interface MobileViewProps {
  isHome: boolean;
  entries: Entry[];
  filteredEntries: Entry[];
  heroEntry: Entry | null;
  movieCount: number;
  tvCount: number;
  favCount: number;
  mediaTab: string;
  genreFilter: string | null;
  tagFilter: string | null;
  searchQuery: string;
  sortBy: SortKey;
  topTags: string[];
  setGenreFilter: (v: string | null) => void;
  setTagFilter: (v: string | null) => void;
  setSearchQuery: (v: string) => void;
  setSortBy: (v: SortKey) => void;
  onSelectEntry: (entry: Entry) => void;
}

export function LibraryMobileView(props: MobileViewProps) {
  const {
    isHome, entries, filteredEntries, heroEntry,
    movieCount, tvCount, favCount, mediaTab,
    genreFilter, tagFilter, searchQuery, sortBy, topTags,
    setGenreFilter, setTagFilter, setSearchQuery, setSortBy,
    onSelectEntry,
  } = props;

  const isMovie = mediaTab === "movie";

  if (isHome) {
    return <MobileHomeCards movieCount={movieCount} tvCount={tvCount} favCount={favCount} />;
  }

  return (
    <>
      {/* Hero banner */}
      {heroEntry && (
        <div
          className="relative mb-2 cursor-pointer animate-fade-up flex-shrink-0"
          onClick={() => onSelectEntry(heroEntry)}
        >
          <div
            className="absolute inset-0 -mx-4"
            style={{
              backgroundImage: `url(${posterUrl(heroEntry.poster, "small")})`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              filter: "brightness(0.15) saturate(1.4) blur(40px)",
              transform: "scale(1.1)",
              willChange: "transform",
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

      {/* Movies/TV tabs */}
      <div className="flex justify-center mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Link
            href="/?tab=movie"
            scroll={false}
            className={`px-4 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all whitespace-nowrap ${
              isMovie
                ? "bg-gradient-to-br from-vr-blue to-vr-blue-dark text-white"
                : "text-[#5c5954] hover:text-[#9a968e]"
            }`}
          >
            🎬 Movies <span className="font-mono-stats text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">{movieCount}</span>
          </Link>
          <Link
            href="/?tab=tv"
            scroll={false}
            className={`px-4 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all whitespace-nowrap ${
              !isMovie
                ? "bg-gradient-to-br from-vr-violet to-vr-violet-dark text-white"
                : "text-[#5c5954] hover:text-[#9a968e]"
            }`}
          >
            📺 TV Shows <span className="font-mono-stats text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">{tvCount}</span>
          </Link>
        </div>
      </div>

      {/* Filter dropdowns */}
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

      {/* Poster grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-20">
        <div className="poster-grid grid grid-cols-3 sm:grid-cols-4 gap-0.5">
          {filteredEntries.map((entry, i) => (
            <div
              key={entry.id}
              className="poster-card relative overflow-hidden bg-bg-deep cursor-pointer animate-slide-in"
              style={{ animationDelay: `${Math.min(i * 30, 400)}ms`, border: "1px solid rgba(255,255,255,0.05)" }}
              onClick={() => onSelectEntry(entry)}
            >
              <div className="aspect-[2/3]">
                {entry.poster ? (
                  <img src={posterUrl(entry.poster, "medium")} alt={entry.title} className="w-full h-full object-cover rounded-[6px]" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-[8px] font-display p-1 text-center bg-bg-card rounded-[6px]">{entry.title}</div>
                )}
              </div>
              {entry.recommended && (
                <div className="absolute top-0.5 left-0.5 text-[8px] drop-shadow-lg">⭐</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function MobileHomeCards({ movieCount, tvCount, favCount }: { movieCount: number; tvCount: number; favCount: number }) {
  return (
    <div className="flex flex-col flex-1 justify-center px-3 pb-16">
      <div className="text-center mb-8">
        <img src="/logo-full.png" alt="" className="w-24 h-24 mx-auto mb-3" />
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
  );
}
