"use client";

import { useState, type Ref } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode } from "react";
import { getAmbientColor, rgba } from "@/lib/ambient-colors";

interface TvFrameProps {
  children: ReactNode;
  className?: string;
  isOn: boolean;
  onPowerToggle: () => void;
  scrollRef?: Ref<HTMLDivElement>;
}

export function TvFrame({ children, className = "", isOn, onPowerToggle, scrollRef }: TvFrameProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mediaTab = searchParams.get("tab") || "movie";
  const ambient = getAmbientColor(pathname);
  const [animState, setAnimState] = useState<"shutting-down" | "booting-up" | null>(null);

  function handlePower() {
    if (animState) return;
    if (isOn) {
      setAnimState("shutting-down");
      setTimeout(() => { onPowerToggle(); setAnimState(null); }, 1400);
    } else {
      onPowerToggle();
      setAnimState("booting-up");
      setTimeout(() => { setAnimState(null); }, 600);
    }
  }

  // Glow color helper
  function glow(r: number, g: number, b: number, strength: number) {
    const s1 = (0.18 * strength).toFixed(2);
    const s2 = (0.08 * strength).toFixed(2);
    return `0 0 80px 30px rgba(${r},${g},${b},${s1}), 0 0 150px 60px rgba(${r},${g},${b},${s2})`;
  }

  // Per-page glow colors: [movie RGB, tv RGB]
  const PAGE_GLOWS: Record<string, { movie: [number, number, number]; tv: [number, number, number] }> = {
    "/":           { movie: [14, 165, 233],  tv: [139, 92, 246] },   // blue / purple
    "/favourites": { movie: [255, 184, 0],   tv: [200, 200, 210] },  // gold / silver
    "/watchlist":  { movie: [139, 92, 246],  tv: [6, 182, 212] },    // purple / cyan
    "/discover":   { movie: [244, 114, 182], tv: [249, 115, 22] },   // pink / orange
  };

  return (
    <div className={`relative flex flex-col flex-1 min-h-0 px-32 ${className}`}>
      {/* Ambient glow — colour matches active media tab */}
      {isOn && (() => {
        const colors = PAGE_GLOWS[pathname] || PAGE_GLOWS["/"];
        const c = mediaTab === "tv" ? colors.tv : colors.movie;
        // Three cycling layers at different intensities
        const g1 = glow(c[0], c[1], c[2], 1.0);
        const g2 = glow(c[0], c[1], c[2], 0.7);
        const g3 = glow(c[0], c[1], c[2], 0.5);
        const pos = { top: 8, left: 136, right: 136, bottom: 8 };
        return (
          <>
            <div className="absolute z-0 pointer-events-none tv-glow-cyan" style={{ ...pos, boxShadow: g1 }} />
            <div className="absolute z-0 pointer-events-none tv-glow-violet" style={{ ...pos, boxShadow: g2 }} />
            <div className="absolute z-0 pointer-events-none tv-glow-teal" style={{ ...pos, boxShadow: g3 }} />
          </>
        );
      })()}

      {/* TV — modern flatscreen */}
      <div
        className={`tv-flatscreen relative z-[2] ${!isOn && !animState ? "tv-flatscreen-off" : ""}`}
      >
        <div className="tv-flatscreen-inner">
          <div ref={scrollRef} className={`tv-scroll ${!isOn ? "pointer-events-none" : ""}`}>
            {children}
          </div>
          {/* CRT overlay for shutdown/boot */}
          <div className={`tv-crt-overlay ${animState || ""}`} />
        </div>

        {/* Power LED — centred vertically in bottom bezel */}
        <button
          onClick={handlePower}
          className="absolute left-1/2 -translate-x-1/2 z-[5] w-[5px] h-[5px] rounded-full cursor-pointer transition-all duration-300 focus:outline-none hover:scale-[1.6]"
          style={{
            bottom: "-6.5px",
            background: (() => {
              if (!isOn) return "radial-gradient(circle at 40% 35%, #555, #333 60%)";
              const colors = PAGE_GLOWS[pathname] || PAGE_GLOWS["/"];
              const c = mediaTab === "tv" ? colors.tv : colors.movie;
              return `radial-gradient(circle at 40% 35%, rgb(${c.join(",")}), rgba(${c.join(",")},0.7) 60%)`;
            })(),
            boxShadow: (() => {
              if (!isOn) return "0 0 3px rgba(80,80,80,0.3)";
              const colors = PAGE_GLOWS[pathname] || PAGE_GLOWS["/"];
              const c = mediaTab === "tv" ? colors.tv : colors.movie;
              return `0 0 6px rgba(${c.join(",")},0.6), 0 0 2px rgba(${c.join(",")},0.8)`;
            })(),
          }}
          aria-label={isOn ? "Turn off TV" : "Turn on TV"}
        />
      </div>

    </div>
  );
}
