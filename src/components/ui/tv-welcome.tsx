"use client";

import { useState, useEffect } from "react";
import { Library, Star, Bookmark, Radar, BarChart3 } from "lucide-react";

interface TvWelcomeProps {
  onNavigate: (area: "library" | "favourites" | "watchlist" | "discover" | "stats") => void;
}

const areas = [
  {
    key: "library" as const,
    label: "Library",
    sub: "Your collection",
    icon: Library,
    rgb: "14,165,233",
  },
  {
    key: "favourites" as const,
    label: "Favourites",
    sub: "Top picks",
    icon: Star,
    rgb: "251,191,36",
  },
  {
    key: "watchlist" as const,
    label: "Watchlist",
    sub: "Queued up",
    icon: Bookmark,
    rgb: "139,92,246",
  },
  {
    key: "discover" as const,
    label: "Discover",
    sub: "Find new",
    icon: Radar,
    rgb: "244,114,182",
  },
  {
    key: "stats" as const,
    label: "Stats",
    sub: "Analytics",
    icon: BarChart3,
    rgb: "45,212,191",
  },
];

export function TvWelcome({ onNavigate }: TvWelcomeProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1500);
    const t4 = setTimeout(() => setPhase(4), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      {/* Welcome text */}
      <div
        className="text-center mb-8"
        style={{
          transition: "all 700ms ease-out",
          opacity: phase >= 1 ? 1 : 0,
          scale: phase >= 1 ? "1" : "0.75",
        }}
      >
        <img
          src="/logo.png"
          alt=""
          className="w-20 h-20 lg:w-28 lg:h-28 mx-auto mb-5 rounded-2xl"
          style={{ transition: "all 500ms ease-out", opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "scale(1)" : "scale(0.5)" }}
        />
        <h1
          className={`font-display text-5xl lg:text-7xl font-bold tracking-[0.18em] mb-4 inline-block ${phase >= 1 && phase < 2 ? "welcome-glitch" : ""}`}
        >
          <span className={`text-vr-blue transition-all duration-700 ${phase >= 2 ? "text-glow-blue" : ""}`}>VR</span>
          <span className={`text-vr-violet transition-all duration-700 delay-200 ${phase >= 2 ? "text-glow-violet" : ""}`}>dict</span>
          <div
            className="mt-2 rounded-full"
            style={{
              background: "linear-gradient(90deg, #0ea5e9, #a78bfa)",
              height: "3px",
              maskImage: "radial-gradient(ellipse 50% 100% at center, black 0%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 50% 100% at center, black 0%, transparent 100%)",
              transition: "all 700ms ease-out 300ms",
              opacity: phase >= 2 ? 1 : 0,
              scale: phase >= 2 ? "1 1" : "0 1",
            }}
          />
        </h1>
        <p
          className="font-body text-base lg:text-lg text-[#5c5954] tracking-[0.25em] uppercase"
          style={{
            transition: "all 800ms ease-out",
            opacity: phase >= 3 ? 1 : 0,
            translate: phase >= 3 ? "0 0" : "0 16px",
          }}
        >
          Your personal cinema console
        </p>
      </div>

      {/* Area cards */}
      <div className="flex gap-3 lg:gap-5 justify-center items-center">
        {areas.map((area, i) => {
          const rgb = area.rgb;
          // Alternate rotation for that "fan out" feel
          const startRotate = i % 2 === 0 ? "-6deg" : "6deg";

          return (
            <button
              key={area.key}
              onClick={() => onNavigate(area.key)}
              className="group relative flex flex-col items-center justify-center w-[140px] lg:w-[165px] h-[210px] lg:h-[250px] rounded-2xl cursor-pointer hover:w-[170px] lg:hover:w-[200px] hover:h-[230px] lg:hover:h-[270px]"
              style={{
                border: `1px solid rgba(${rgb},0.15)`,
                background: `linear-gradient(to bottom, rgba(${rgb},0.25), rgba(${rgb},0.08) 50%, transparent)`,
                opacity: phase >= 4 ? 1 : 0,
                translate: phase >= 4 ? "0 0" : "0 96px",
                scale: phase >= 4 ? "1" : "0.5",
                rotate: phase >= 4 ? "0deg" : startRotate,
                transition: phase >= 4
                  ? `opacity 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${50 + i * 60}ms, translate 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${50 + i * 60}ms, scale 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${50 + i * 60}ms, rotate 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${50 + i * 60}ms, width 300ms cubic-bezier(0.34, 1.2, 0.64, 1), height 300ms cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 300ms ease, border-color 300ms ease`
                  : "opacity 200ms ease, translate 200ms ease, scale 200ms ease, rotate 200ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb},0.4)`; e.currentTarget.style.boxShadow = `0 0 40px rgba(${rgb},0.25), 0 12px 40px rgba(0,0,0,0.5)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb},0.15)`; e.currentTarget.style.boxShadow = ""; }}
            >
              <area.icon
                size={42}
                className="mb-3 transition-transform duration-300 group-hover:scale-125"
                style={{ color: `rgb(${rgb})` }}
              />
              <span className="font-display text-[14px] lg:text-[16px] font-medium text-[#e8e4dc] tracking-wider uppercase">
                {area.label}
              </span>
              <span className="font-body text-[11px] lg:text-[12px] text-[#5c5954] mt-1 tracking-wide">
                {area.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
