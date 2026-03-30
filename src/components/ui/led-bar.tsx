"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { getPageGlow } from "@/lib/ambient-colors";

export function LedBars() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mediaTab = searchParams.get("tab") || "movie";
  const c = getPageGlow(pathname, mediaTab);

  const wallGlow = `radial-gradient(ellipse 120% 100% at 50% 50%, rgba(${c[0]},${c[1]},${c[2]},0.45), rgba(${c[0]},${c[1]},${c[2]},0.15) 50%, transparent 80%)`;
  const barShadow = `inset 0 1px 4px rgba(0,0,0,0.9), 0 0 1px rgba(255,255,255,0.03), 0 0 30px 8px rgba(${c[0]},${c[1]},${c[2]},0.20), 0 0 60px 20px rgba(${c[0]},${c[1]},${c[2]},0.10), 0 0 100px 40px rgba(${c[0]},${c[1]},${c[2]},0.05)`;
  const baseShadow = "0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.02)";

  const bar = (side: "left" | "right") => (
    <div
      className="absolute z-[3] pointer-events-none hidden lg:flex flex-col items-center"
      style={{ [side]: 36, top: "20%", bottom: 18 }}
    >
      {/* Wide wall glow behind bar */}
      <div className="absolute -inset-x-16 inset-y-0 rounded-full opacity-80 blur-3xl transition-all duration-700" style={{ background: wallGlow }} />
      {/* Extra corner fill — wide ambient wash */}
      <div className="absolute -inset-x-24 -inset-y-8 rounded-full opacity-40 blur-[48px] transition-all duration-700" style={{ background: `radial-gradient(ellipse, rgba(${c[0]},${c[1]},${c[2]},0.25), transparent 70%)` }} />
      <div className="relative flex-1 w-[16px] rounded-[8px] bg-[#0a0a0c] border border-[#1a1a1c] transition-shadow duration-700" style={{ boxShadow: barShadow }} />
      <div className="relative w-[36px] h-[10px] rounded-b-[4px] bg-[#060608] border border-t-0 border-[#151517] mt-[-1px]" style={{ boxShadow: baseShadow }} />
    </div>
  );

  return (
    <>
      {bar("left")}
      {bar("right")}
    </>
  );
}
