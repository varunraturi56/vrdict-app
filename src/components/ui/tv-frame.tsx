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
    <div className={`relative flex flex-col flex-1 min-h-0 px-10 ${className}`}>
      {/* TV — modern flatscreen */}
      <div
        className={`tv-flatscreen relative ${!isOn && !animState ? "tv-flatscreen-off" : ""}`}
      >
        {/* Screen with ambient glow — glow comes from screen, not bezel */}
        <div
          className="tv-flatscreen-inner"
          style={{
            boxShadow: isOn
              ? `0 0 60px 20px ${rgba(ambient, 0.08)}, 0 0 120px 50px ${rgba(ambient, 0.04)}`
              : "none",
            transition: "box-shadow 0.8s ease",
          }}
        >
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
