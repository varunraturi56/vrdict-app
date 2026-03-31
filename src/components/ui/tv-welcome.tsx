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
  const [phase, setPhase] = useState(0); // 0=hidden, 1=glitch, 2=title solid, 3=subtitle, 4=cards

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);   // Glitch flicker
    const t2 = setTimeout(() => setPhase(2), 1000);  // Title solidifies
    const t3 = setTimeout(() => setPhase(3), 1500);  // Subtitle types in
    const t4 = setTimeout(() => setPhase(4), 2000);  // Cards fan out
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      {/* Welcome text — large, cinematic */}
      <div className={`text-center mb-8 transition-all duration-700 ease-out ${phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
        <h1
          className={`font-display text-5xl lg:text-7xl font-bold tracking-[0.18em] mb-4 inline-block ${phase >= 1 && phase < 2 ? "welcome-glitch" : ""}`}
        >
          <span className={`text-vr-blue transition-all duration-700 ${phase >= 2 ? "text-glow-blue" : ""}`}>VR</span>
          <span className={`text-vr-violet transition-all duration-700 delay-200 ${phase >= 2 ? "text-glow-violet" : ""}`}>dict</span>
          <div className={`mt-2 rounded-full transition-all duration-700 delay-300 ${phase >= 2 ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}`}
            style={{
              background: "linear-gradient(90deg, #0ea5e9, #a78bfa)",
              height: "3px",
              maskImage: "radial-gradient(ellipse 50% 100% at center, black 0%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 50% 100% at center, black 0%, transparent 100%)",
            }}
          />
        </h1>
        <p
          className={`font-body text-base lg:text-lg text-[#5c5954] tracking-[0.25em] uppercase transition-all duration-800 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          Your personal cinema console
        </p>
      </div>

      {/* Area cards — horizontal row */}
      <div className="flex gap-3 lg:gap-5 justify-center items-center">
        {areas.map((area, i) => (
          <button
            key={area.key}
            onClick={() => onNavigate(area.key)}
            className={`group relative flex flex-col items-center justify-center w-[140px] lg:w-[165px] h-[210px] lg:h-[250px] rounded-2xl border bg-gradient-to-b ${area.gradient} ${area.border} ${area.glowShadow} cursor-pointer hover:w-[170px] lg:hover:w-[200px] hover:h-[230px] lg:hover:h-[270px] ${
              phase >= 4 ? "opacity-100 translate-y-0 scale-100 rotate-0" : "opacity-0 translate-y-24 scale-50 rotate-6"
            }`}
            style={{
              transition: phase >= 4
                ? `opacity 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 100 + 50}ms, transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 100 + 50}ms, width 300ms cubic-bezier(0.34, 1.2, 0.64, 1), height 300ms cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 300ms ease, border-color 300ms ease`
                : "opacity 200ms ease, transform 200ms ease",
            }}
          >
            <area.icon
              size={42}
              className={`${area.iconColor} mb-3 transition-transform duration-300 group-hover:scale-125`}
            />
            <span className="font-display text-[14px] lg:text-[16px] font-medium text-[#e8e4dc] tracking-wider uppercase">
              {area.label}
            </span>
            <span className="font-body text-[11px] lg:text-[12px] text-[#5c5954] mt-1 tracking-wide">
              {area.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
