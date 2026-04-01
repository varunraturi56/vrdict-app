"use client";

import { useState, useEffect } from "react";
import { Film, Tv, ChevronLeft, Library, type LucideIcon } from "lucide-react";

interface TvCategorySelectProps {
  area: string;
  movieCount: number;
  tvCount: number;
  favCount: number;
  onSelect: (category: "movie" | "tv") => void;
  onBack: () => void;
  onFavourites: () => void;
  icon?: LucideIcon;
  accentColor?: string;
  accentGlow?: string;
  glowClass?: string;
  movieRgb?: string;
  tvRgb?: string;
}

export function TvCategorySelect({
  area,
  movieCount,
  tvCount,
  onSelect,
  onBack,
  icon: Icon = Library,
  accentColor = "text-vr-blue",
  accentGlow = "drop-shadow(0 0 8px rgba(14,165,233,0.5))",
  glowClass = "text-glow-blue",
  movieRgb = "14,165,233",
  tvRgb = "139,92,246",
}: TvCategorySelectProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 500);
    const t3 = setTimeout(() => setPhase(3), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 lg:px-16">
      {/* Back button */}
      <button
        onClick={onBack}
        className={`absolute top-4 left-4 lg:top-6 lg:left-6 flex items-center gap-1.5 text-[#5c5954] hover:text-[#e8e4dc] z-10`}
        style={{
          transition: "all 500ms ease",
          opacity: phase >= 1 ? 1 : 0,
          translate: phase >= 1 ? "0 0" : "-16px 0",
        }}
      >
        <ChevronLeft size={16} />
        <span className="font-display text-[10px] uppercase tracking-wider">Back</span>
      </button>

      {/* Area title */}
      <div
        style={{
          transition: "all 700ms ease-out",
          opacity: phase >= 1 ? 1 : 0,
          scale: phase >= 1 ? "1" : "0.9",
          translate: phase >= 1 ? "0 0" : "0 16px",
        }}
        className="text-center mb-6 md:mb-10 xl:mb-14"
      >
        <div className="flex items-center justify-center gap-3 mb-1">
          <Icon className={`w-7 h-7 md:w-8 md:h-8 xl:w-9 xl:h-9 ${accentColor}`} style={{ filter: accentGlow }} />
          <h2 className={`font-display text-2xl md:text-4xl xl:text-5xl font-bold tracking-[0.15em] ${accentColor} ${glowClass}`}>
            {area}
          </h2>
        </div>
        <p
          style={{
            transition: "all 600ms ease-out",
            opacity: phase >= 2 ? 1 : 0,
            translate: phase >= 2 ? "0 0" : "0 12px",
          }}
          className="font-body text-xs md:text-sm xl:text-base text-[#5c5954] mt-2 md:mt-3 tracking-[0.2em] uppercase"
        >
          Choose what to browse
        </p>
      </div>

      {/* Category cards */}
      <div className="poster-grid flex gap-5 lg:gap-8">
        {/* Movie card */}
        <button
          onClick={() => onSelect("movie")}
          className="poster-card group relative flex flex-col items-center justify-center w-[120px] md:w-[160px] xl:w-[190px] aspect-[2/3] rounded-2xl cursor-pointer overflow-hidden"
          style={{
            border: `1px solid rgba(${movieRgb},0.15)`,
            background: `linear-gradient(to bottom, rgba(${movieRgb},0.25), rgba(${movieRgb},0.08) 50%, transparent)`,
            opacity: phase >= 3 ? 1 : 0,
            translate: phase >= 3 ? "0 0" : "0 80px",
            scale: phase >= 3 ? "1" : "0.5",
            rotate: phase >= 3 ? "0deg" : "-6deg",
            transition: phase >= 3
              ? "opacity 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 50ms, translate 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 50ms, scale 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 50ms, rotate 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 50ms, box-shadow 300ms ease, border-color 300ms ease, filter 250ms ease, transform 250ms cubic-bezier(0.2, 0, 0, 1.1)"
              : "opacity 200ms ease, translate 200ms ease, scale 200ms ease, rotate 200ms ease",
          }}
        >
          <Film className="mb-3 w-8 h-8 md:w-10 md:h-10 xl:w-12 xl:h-12 transition-transform duration-300 group-hover:scale-125" style={{ color: `rgb(${movieRgb})` }} />
          <span className="font-display text-[12px] md:text-[14px] xl:text-[16px] font-medium text-[#e8e4dc] tracking-wider uppercase">Movies</span>
          {movieCount > 0 && (
            <span className="font-mono-stats text-[10px] md:text-[12px] xl:text-[13px] text-[#5c5954] mt-1.5">{movieCount} titles</span>
          )}
        </button>

        {/* TV card */}
        <button
          onClick={() => onSelect("tv")}
          className="poster-card group relative flex flex-col items-center justify-center w-[120px] md:w-[160px] xl:w-[190px] aspect-[2/3] rounded-2xl cursor-pointer overflow-hidden"
          style={{
            border: `1px solid rgba(${tvRgb},0.15)`,
            background: `linear-gradient(to bottom, rgba(${tvRgb},0.25), rgba(${tvRgb},0.08) 50%, transparent)`,
            opacity: phase >= 3 ? 1 : 0,
            translate: phase >= 3 ? "0 0" : "0 80px",
            scale: phase >= 3 ? "1" : "0.5",
            rotate: phase >= 3 ? "0deg" : "6deg",
            transition: phase >= 3
              ? "opacity 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms, translate 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms, scale 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms, rotate 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms, box-shadow 300ms ease, border-color 300ms ease, filter 250ms ease, transform 250ms cubic-bezier(0.2, 0, 0, 1.1)"
              : "opacity 200ms ease, translate 200ms ease, scale 200ms ease, rotate 200ms ease",
          }}
        >
          <Tv className="mb-3 w-8 h-8 md:w-10 md:h-10 xl:w-12 xl:h-12 transition-transform duration-300 group-hover:scale-125" style={{ color: `rgb(${tvRgb})` }} />
          <span className="font-display text-[12px] md:text-[14px] xl:text-[16px] font-medium text-[#e8e4dc] tracking-wider uppercase">TV Shows</span>
          {tvCount > 0 && (
            <span className="font-mono-stats text-[10px] md:text-[12px] xl:text-[13px] text-[#5c5954] mt-1.5">{tvCount} titles</span>
          )}
        </button>
      </div>
    </div>
  );
}
