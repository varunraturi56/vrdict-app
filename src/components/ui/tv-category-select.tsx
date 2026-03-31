"use client";

import { Film, Tv, Star, ChevronLeft } from "lucide-react";

interface TvCategorySelectProps {
  area: string;
  movieCount: number;
  tvCount: number;
  favCount: number;
  onSelect: (category: "movie" | "tv") => void;
  onBack: () => void;
  onFavourites: () => void;
}

export function TvCategorySelect({
  area,
  movieCount,
  tvCount,
  favCount,
  onSelect,
  onBack,
  onFavourites,
}: TvCategorySelectProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 lg:px-16">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 lg:top-6 lg:left-6 flex items-center gap-1.5 text-[#5c5954] hover:text-[#e8e4dc] transition-colors z-10"
      >
        <ChevronLeft size={16} />
        <span className="font-display text-[10px] uppercase tracking-wider">Back</span>
      </button>

      {/* Area title */}
      <div className="text-center mb-10 lg:mb-14">
        <h2 className="font-display text-xl lg:text-2xl font-semibold tracking-wider text-[#e8e4dc] capitalize">
          {area}
        </h2>
        <p className="font-body text-[12px] text-[#5c5954] mt-1.5 tracking-wide">
          Choose what to browse
        </p>
      </div>

      {/* Category cards */}
      <div className="flex gap-6 lg:gap-8 mb-8">
        <button
          onClick={() => onSelect("movie")}
          className="group flex flex-col items-center justify-center w-40 h-44 lg:w-48 lg:h-52 rounded-xl border border-vr-blue/20 hover:border-vr-blue/40 bg-gradient-to-b from-vr-blue/15 to-vr-blue/3 transition-all duration-300 hover:scale-[1.03] group-hover:shadow-[0_0_30px_rgba(14,165,233,0.15)] cursor-pointer"
        >
          <Film
            size={40}
            className="text-vr-blue mb-4 transition-transform duration-300 group-hover:scale-110"
          />
          <span className="font-display text-base font-medium text-[#e8e4dc] tracking-wider uppercase">
            Movies
          </span>
          <span className="font-mono-stats text-[11px] text-[#5c5954] mt-1.5">
            {movieCount} titles
          </span>
        </button>

        <button
          onClick={() => onSelect("tv")}
          className="group flex flex-col items-center justify-center w-40 h-44 lg:w-48 lg:h-52 rounded-xl border border-vr-violet/20 hover:border-vr-violet/40 bg-gradient-to-b from-vr-violet/15 to-vr-violet/3 transition-all duration-300 hover:scale-[1.03] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] cursor-pointer"
        >
          <Tv
            size={40}
            className="text-vr-violet mb-4 transition-transform duration-300 group-hover:scale-110"
          />
          <span className="font-display text-base font-medium text-[#e8e4dc] tracking-wider uppercase">
            TV Shows
          </span>
          <span className="font-mono-stats text-[11px] text-[#5c5954] mt-1.5">
            {tvCount} titles
          </span>
        </button>
      </div>

      {/* Quick chips */}
      <div className="flex gap-3">
        <button
          onClick={onFavourites}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-amber-400/20 hover:border-amber-400/40 text-amber-400/70 hover:text-amber-400 bg-amber-400/5 transition-all duration-200"
        >
          <Star size={14} />
          <span className="font-display text-[10px] uppercase tracking-wider">
            Favourites
          </span>
          <span className="font-mono-stats text-[10px] text-[#5c5954] ml-1">
            {favCount}
          </span>
        </button>
      </div>
    </div>
  );
}
