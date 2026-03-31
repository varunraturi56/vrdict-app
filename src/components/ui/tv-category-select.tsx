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
  /** Custom RGB for movie card — e.g. "255,184,0" */
  movieRgb?: string;
  /** Custom RGB for TV card — e.g. "200,200,210" */
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
  const [phase, setPhase] = useState(0); // 0=hidden, 1=title, 2=subtitle, 3=cards

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
        className={`absolute top-4 left-4 lg:top-6 lg:left-6 flex items-center gap-1.5 text-[#5c5954] hover:text-[#e8e4dc] transition-all z-10 duration-500 ${phase >= 1 ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
      >
        <ChevronLeft size={16} />
        <span className="font-display text-[10px] uppercase tracking-wider">Back</span>
      </button>

      {/* Area title */}
      <div className={`text-center mb-10 lg:mb-14 transition-all duration-700 ease-out ${phase >= 1 ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4"}`}>
        <div className="flex items-center justify-center gap-3 mb-1">
          <Icon size={36} className={accentColor} style={{ filter: accentGlow }} />
          <h2 className={`font-display text-4xl lg:text-5xl font-bold tracking-[0.15em] ${accentColor} ${glowClass}`}>
            {area}
          </h2>
        </div>
        <p className={`font-body text-sm lg:text-base text-[#5c5954] mt-3 tracking-[0.2em] uppercase transition-all duration-600 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
          Choose what to browse
        </p>
      </div>

      {/* Category cards */}
      <div className="flex gap-5 lg:gap-8">
        <button
          onClick={() => onSelect("movie")}
          className={`group relative flex flex-col items-center justify-center w-[160px] lg:w-[190px] h-[240px] lg:h-[280px] rounded-2xl cursor-pointer hover:w-[185px] lg:hover:w-[220px] hover:h-[260px] lg:hover:h-[300px] ${
            phase >= 3 ? "opacity-100 translate-y-0 scale-100 rotate-0" : "opacity-0 translate-y-20 scale-50 -rotate-6"
          }`}
          style={{
            border: `1px solid rgba(${movieRgb},0.15)`,
            background: `linear-gradient(to bottom, rgba(${movieRgb},0.25), rgba(${movieRgb},0.08) 50%, transparent)`,
            transition: phase >= 3
              ? "opacity 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 50ms, transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 50ms, width 300ms cubic-bezier(0.34, 1.2, 0.64, 1), height 300ms cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 300ms ease, border-color 300ms ease"
              : "opacity 200ms ease, transform 200ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${movieRgb},0.4)`; e.currentTarget.style.boxShadow = `0 0 40px rgba(${movieRgb},0.25), 0 12px 40px rgba(0,0,0,0.5)`; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = `rgba(${movieRgb},0.15)`; e.currentTarget.style.boxShadow = ""; }}
        >
          <Film
            size={48}
            className="mb-4 transition-transform duration-300 group-hover:scale-125"
            style={{ color: `rgb(${movieRgb})` }}
          />
          <span className="font-display text-[16px] lg:text-[18px] font-medium text-[#e8e4dc] tracking-wider uppercase">
            Movies
          </span>
          <span className="font-mono-stats text-[12px] lg:text-[13px] text-[#5c5954] mt-2">
            {movieCount} titles
          </span>
        </button>

        <button
          onClick={() => onSelect("tv")}
          className={`group relative flex flex-col items-center justify-center w-[160px] lg:w-[190px] h-[240px] lg:h-[280px] rounded-2xl cursor-pointer hover:w-[185px] lg:hover:w-[220px] hover:h-[260px] lg:hover:h-[300px] ${
            phase >= 3 ? "opacity-100 translate-y-0 scale-100 rotate-0" : "opacity-0 translate-y-20 scale-50 rotate-6"
          }`}
          style={{
            border: `1px solid rgba(${tvRgb},0.15)`,
            background: `linear-gradient(to bottom, rgba(${tvRgb},0.25), rgba(${tvRgb},0.08) 50%, transparent)`,
            transition: phase >= 3
              ? "opacity 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms, transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms, width 300ms cubic-bezier(0.34, 1.2, 0.64, 1), height 300ms cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 300ms ease, border-color 300ms ease"
              : "opacity 200ms ease, transform 200ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${tvRgb},0.4)`; e.currentTarget.style.boxShadow = `0 0 40px rgba(${tvRgb},0.25), 0 12px 40px rgba(0,0,0,0.5)`; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = `rgba(${tvRgb},0.15)`; e.currentTarget.style.boxShadow = ""; }}
        >
          <Tv
            size={48}
            className="mb-4 transition-transform duration-300 group-hover:scale-125"
            style={{ color: `rgb(${tvRgb})` }}
          />
          <span className="font-display text-[16px] lg:text-[18px] font-medium text-[#e8e4dc] tracking-wider uppercase">
            TV Shows
          </span>
          <span className="font-mono-stats text-[12px] lg:text-[13px] text-[#5c5954] mt-2">
            {tvCount} titles
          </span>
        </button>
      </div>
    </div>
  );
}
