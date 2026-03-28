"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { getAmbientColor, rgba } from "@/lib/ambient-colors";

interface TvFrameProps {
  children: ReactNode;
  className?: string;
  isOn: boolean;
  onPowerToggle: () => void;
}

export function TvFrame({ children, className = "", isOn, onPowerToggle }: TvFrameProps) {
  const pathname = usePathname();
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

  return (
    <div className={`relative flex flex-col flex-1 min-h-0 px-20 ${className}`}>
      {/* Ambient glow — three layers cycling between cyan, violet, teal */}
      {isOn && (
        <>
          <div
            className="absolute z-0 pointer-events-none tv-glow-cyan"
            style={{
              top: 8, left: 88, right: 88, bottom: 8,
              boxShadow: "0 0 60px 20px rgba(14,165,233,0.12), 0 0 120px 50px rgba(14,165,233,0.05)",
            }}
          />
          <div
            className="absolute z-0 pointer-events-none tv-glow-violet"
            style={{
              top: 8, left: 88, right: 88, bottom: 8,
              boxShadow: "0 0 60px 20px rgba(167,139,250,0.12), 0 0 120px 50px rgba(167,139,250,0.05)",
            }}
          />
          <div
            className="absolute z-0 pointer-events-none tv-glow-teal"
            style={{
              top: 8, left: 88, right: 88, bottom: 8,
              boxShadow: "0 0 60px 20px rgba(6,182,212,0.10), 0 0 120px 50px rgba(6,182,212,0.04)",
            }}
          />
        </>
      )}

      {/* TV — modern flatscreen */}
      <div
        className={`tv-flatscreen relative z-[1] ${!isOn && !animState ? "tv-flatscreen-off" : ""}`}
      >
        <div className="tv-flatscreen-inner">
          <div className={`tv-scroll ${!isOn ? "pointer-events-none" : ""}`}>
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
            background: isOn
              ? `radial-gradient(circle at 40% 35%, ${rgba(ambient, 1)}, ${rgba(ambient, 0.7)} 60%)`
              : "radial-gradient(circle at 40% 35%, #555, #333 60%)",
            boxShadow: isOn
              ? `0 0 6px ${rgba(ambient, 0.6)}, 0 0 2px ${rgba(ambient, 0.8)}`
              : "0 0 3px rgba(80,80,80,0.3)",
          }}
          aria-label={isOn ? "Turn off TV" : "Turn on TV"}
        />
      </div>

    </div>
  );
}
