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
    gradient: "from-vr-blue/25 via-vr-blue/8 to-transparent",
    border: "border-vr-blue/15 hover:border-vr-blue/40",
    iconColor: "text-vr-blue",
    glowShadow: "hover:shadow-[0_0_40px_rgba(14,165,233,0.25),0_12px_40px_rgba(0,0,0,0.5)]",
  },
  {
    key: "favourites" as const,
    label: "Favourites",
    sub: "Top picks",
    icon: Star,
    gradient: "from-amber-400/25 via-amber-400/8 to-transparent",
    border: "border-amber-400/15 hover:border-amber-400/40",
    iconColor: "text-amber-400",
    glowShadow: "hover:shadow-[0_0_40px_rgba(251,191,36,0.25),0_12px_40px_rgba(0,0,0,0.5)]",
  },
  {
    key: "watchlist" as const,
    label: "Watchlist",
    sub: "Queued up",
    icon: Bookmark,
    gradient: "from-vr-violet/25 via-vr-violet/8 to-transparent",
    border: "border-vr-violet/15 hover:border-vr-violet/40",
    iconColor: "text-vr-violet",
    glowShadow: "hover:shadow-[0_0_40px_rgba(139,92,246,0.25),0_12px_40px_rgba(0,0,0,0.5)]",
  },
  {
    key: "discover" as const,
    label: "Discover",
    sub: "Find new",
    icon: Radar,
    gradient: "from-pink-500/25 via-pink-500/8 to-transparent",
    border: "border-pink-500/15 hover:border-pink-500/40",
    iconColor: "text-pink-400",
    glowShadow: "hover:shadow-[0_0_40px_rgba(244,114,182,0.25),0_12px_40px_rgba(0,0,0,0.5)]",
  },
  {
    key: "stats" as const,
    label: "Stats",
    sub: "Analytics",
    icon: BarChart3,
    gradient: "from-teal-400/25 via-teal-400/8 to-transparent",
    border: "border-teal-400/15 hover:border-teal-400/40",
    iconColor: "text-teal-400",
    glowShadow: "hover:shadow-[0_0_40px_rgba(45,212,191,0.25),0_12px_40px_rgba(0,0,0,0.5)]",
  },
];

export function TvWelcome({ onNavigate }: TvWelcomeProps) {
  const [phase, setPhase] = useState(0); // 0=hidden, 1=title, 2=subtitle, 3=cards

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);   // Title appears
    const t2 = setTimeout(() => setPhase(2), 1200);  // Subtitle fades in
    const t3 = setTimeout(() => setPhase(3), 1800);  // Cards bounce in
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      {/* Welcome text — large, cinematic */}
      <div className={`text-center mb-10 transition-all duration-1000 ease-out ${phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
        <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-[0.15em] mb-3">
          <span className={`text-vr-blue transition-all duration-700 ${phase >= 1 ? "text-glow-blue" : ""}`}>VR</span>
          <span className={`text-vr-violet transition-all duration-700 delay-200 ${phase >= 1 ? "text-glow-violet" : ""}`}>dict</span>
        </h1>
        <p className={`font-body text-sm lg:text-base text-[#5c5954] tracking-[0.2em] uppercase transition-all duration-800 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
          Your personal cinema console
        </p>
      </div>

      {/* Area cards — horizontal row, hovered card expands pushing siblings */}
      <div className="flex gap-3 lg:gap-4 justify-center items-center">
        {areas.map((area, i) => (
          <button
            key={area.key}
            onClick={() => onNavigate(area.key)}
            className={`group relative flex flex-col items-center justify-center w-[130px] lg:w-[150px] h-[195px] lg:h-[225px] rounded-2xl border bg-gradient-to-b ${area.gradient} ${area.border} ${area.glowShadow} cursor-pointer hover:w-[160px] lg:hover:w-[185px] hover:h-[215px] lg:hover:h-[248px] ${
              phase >= 3 ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-16 scale-75"
            }`}
            style={{
              transition: phase >= 3
                ? `opacity 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 120 + 50}ms, transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 120 + 50}ms, width 300ms cubic-bezier(0.34, 1.2, 0.64, 1), height 300ms cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 300ms ease, border-color 300ms ease`
                : "opacity 200ms ease, transform 200ms ease",
            }}
          >
            <area.icon
              size={36}
              className={`${area.iconColor} mb-3 transition-transform duration-300 group-hover:scale-125`}
            />
            <span className="font-display text-[13px] lg:text-[14px] font-medium text-[#e8e4dc] tracking-wider uppercase">
              {area.label}
            </span>
            <span className="font-body text-[10px] lg:text-[11px] text-[#5c5954] mt-1 tracking-wide">
              {area.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
