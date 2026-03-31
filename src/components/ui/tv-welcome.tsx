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
    glowShadow: "hover:shadow-[0_0_30px_rgba(14,165,233,0.2),0_8px_32px_rgba(0,0,0,0.4)]",
  },
  {
    key: "favourites" as const,
    label: "Favourites",
    sub: "Top picks",
    icon: Star,
    gradient: "from-amber-400/25 via-amber-400/8 to-transparent",
    border: "border-amber-400/15 hover:border-amber-400/40",
    iconColor: "text-amber-400",
    glowShadow: "hover:shadow-[0_0_30px_rgba(251,191,36,0.2),0_8px_32px_rgba(0,0,0,0.4)]",
  },
  {
    key: "watchlist" as const,
    label: "Watchlist",
    sub: "Queued up",
    icon: Bookmark,
    gradient: "from-vr-violet/25 via-vr-violet/8 to-transparent",
    border: "border-vr-violet/15 hover:border-vr-violet/40",
    iconColor: "text-vr-violet",
    glowShadow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.2),0_8px_32px_rgba(0,0,0,0.4)]",
  },
  {
    key: "discover" as const,
    label: "Discover",
    sub: "Find new",
    icon: Radar,
    gradient: "from-pink-500/25 via-pink-500/8 to-transparent",
    border: "border-pink-500/15 hover:border-pink-500/40",
    iconColor: "text-pink-400",
    glowShadow: "hover:shadow-[0_0_30px_rgba(244,114,182,0.2),0_8px_32px_rgba(0,0,0,0.4)]",
  },
  {
    key: "stats" as const,
    label: "Stats",
    sub: "Analytics",
    icon: BarChart3,
    gradient: "from-teal-400/25 via-teal-400/8 to-transparent",
    border: "border-teal-400/15 hover:border-teal-400/40",
    iconColor: "text-teal-400",
    glowShadow: "hover:shadow-[0_0_30px_rgba(45,212,191,0.2),0_8px_32px_rgba(0,0,0,0.4)]",
  },
];

export function TvWelcome({ onNavigate }: TvWelcomeProps) {
  const [booted, setBooted] = useState(false);
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    // Boot text appears after a short delay
    const bootTimer = setTimeout(() => setBooted(true), 300);
    // Cards stagger in after text
    const cardTimer = setTimeout(() => setShowCards(true), 800);
    return () => { clearTimeout(bootTimer); clearTimeout(cardTimer); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      {/* Welcome text — fades in with glow */}
      <div className={`text-center mb-8 transition-all duration-1000 ${booted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <h1 className="font-display text-2xl font-semibold tracking-wider mb-1.5">
          <span className="text-vr-blue text-glow-blue">VR</span>
          <span className="text-vr-violet">dict</span>
        </h1>
        <p className={`font-body text-[12px] text-[#5c5954] tracking-wide transition-all duration-700 delay-300 ${booted ? "opacity-100" : "opacity-0"}`}>
          Your personal cinema console
        </p>
      </div>

      {/* Area cards — horizontal row, poster-like proportions */}
      <div className="flex gap-3 w-full max-w-[650px] justify-center">
        {areas.map((area, i) => (
          <button
            key={area.key}
            onClick={() => onNavigate(area.key)}
            className={`welcome-card group relative flex flex-col items-center justify-center w-[110px] aspect-[2/3] rounded-xl border bg-gradient-to-b ${area.gradient} ${area.border} ${area.glowShadow} transition-all duration-300 hover:scale-[1.08] cursor-pointer ${
              showCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{
              transitionDelay: showCards ? `${i * 100 + 100}ms` : "0ms",
              transitionProperty: "opacity, transform, box-shadow, border-color",
              transitionTimingFunction: showCards ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease",
            }}
          >
            <area.icon
              size={26}
              className={`${area.iconColor} mb-2.5 transition-transform duration-300 group-hover:scale-110`}
            />
            <span className="font-display text-[11px] font-medium text-[#e8e4dc] tracking-wider uppercase">
              {area.label}
            </span>
            <span className="font-body text-[9px] text-[#5c5954] mt-0.5 tracking-wide">
              {area.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
