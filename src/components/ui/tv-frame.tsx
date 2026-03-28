"use client";

import { useState, useEffect, type ReactNode } from "react";

interface TvFrameProps {
  children: ReactNode;
  className?: string;
  isOn?: boolean;
  onPowerChange?: (isOn: boolean) => void;
}

export function TvFrame({
  children,
  className = "",
  isOn: externalIsOn,
  onPowerChange,
}: TvFrameProps) {
  const controlled = externalIsOn !== undefined;
  const [internalIsOn, setInternalIsOn] = useState(true);
  const isOn = controlled ? externalIsOn : internalIsOn;
  const [animState, setAnimState] = useState<"shutting-down" | "booting-up" | null>(null);

  // Sync animation when external power changes
  useEffect(() => {
    if (!controlled) return;
    // handled by handlePower
  }, [controlled, externalIsOn]);

  function handlePower() {
    if (animState) return;

    if (isOn) {
      setAnimState("shutting-down");
      setTimeout(() => {
        if (!controlled) setInternalIsOn(false);
        onPowerChange?.(false);
        setAnimState(null);
      }, 1400);
    } else {
      if (!controlled) setInternalIsOn(true);
      onPowerChange?.(true);
      setAnimState("booting-up");
      setTimeout(() => {
        setAnimState(null);
      }, 600);
    }
  }

  const frameClass = [
    "tv-frame",
    !isOn && !animState ? "tv-frame-off" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`relative flex flex-col flex-1 min-h-0 ${className}`}>
      <div className={frameClass}>
        <div className="tv-frame-inner">
          {/* Scrollable content area */}
          <div
            className={`tv-scroll ${!isOn ? "pointer-events-none" : ""}`}
          >
            {children}
          </div>

          {/* CRT overlay — uses CSS class-based animations from globals.css */}
          <div
            className={`tv-crt-overlay ${animState || ""}`}
          />
        </div>
      </div>

      {/* Power button — sits on the TV stand */}
      <button
        onClick={handlePower}
        className="absolute bottom-[41px] left-1/2 -translate-x-1/2 z-[3] w-[6px] h-[6px] rounded-full border-0 p-0 cursor-pointer transition-all duration-300 focus:outline-none"
        style={{
          background: isOn
            ? "radial-gradient(circle at 40% 35%, #ff6b6b, #ef4444 50%, #b91c1c)"
            : "radial-gradient(circle at 40% 35%, #666, #444 50%, #333)",
          boxShadow: isOn
            ? "0 0 6px rgba(239,68,68,0.5), 0 0 2px rgba(239,68,68,0.8)"
            : "0 0 4px rgba(100,100,100,0.3)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform =
            "translateX(-50%) scale(1.3)";
          if (isOn) {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 10px rgba(239,68,68,0.7), 0 0 4px rgba(239,68,68,0.9)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform =
            "translateX(-50%) scale(1)";
          if (isOn) {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 6px rgba(239,68,68,0.5), 0 0 2px rgba(239,68,68,0.8)";
          }
        }}
        aria-label={isOn ? "Turn off TV" : "Turn on TV"}
      />
    </div>
  );
}
