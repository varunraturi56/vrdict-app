import { Sparkles } from "lucide-react";

export default function VRcommendPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={22} className="text-neon-amber" />
        <h1 className="font-display text-xl font-semibold text-gradient-vr tracking-wider uppercase">
          VRcommend
        </h1>
      </div>

      {/* Sub-tabs placeholder */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-card/80 border border-border-glow w-fit mb-6">
        <button className="px-4 py-2 rounded-md text-sm font-display uppercase tracking-wider bg-gradient-to-br from-vr-blue to-vr-blue-dark text-white">
          🎬 Movies
        </button>
        <button className="px-4 py-2 rounded-md text-sm font-display uppercase tracking-wider text-[#5c5954] hover:text-[#9a968e] transition-colors">
          📺 TV Shows
        </button>
      </div>

      {/* Mood filter placeholder */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["Any Mood", "😊 Feel Good", "🧠 Intense", "⚔️ Epic", "🌙 Chill Night", "💎 Hidden Finds"].map(
          (mood) => (
            <span
              key={mood}
              className="px-3 py-1.5 rounded-full text-xs font-display uppercase tracking-wider border border-border-glow bg-bg-card/50 text-[#5c5954]"
            >
              {mood}
            </span>
          )
        )}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 rounded-2xl border border-border-glow bg-bg-card/50 flex items-center justify-center mb-6">
          <Sparkles size={36} className="text-neon-amber/30" />
        </div>
        <h2 className="font-display text-lg text-[#e8e4dc] tracking-wider mb-2">
          Build Your Library First
        </h2>
        <p className="font-body text-[#5c5954] text-center max-w-sm">
          Browse your own collection filtered by mood, genre, and tags. Surface
          the perfect recommendation for any occasion.
        </p>
      </div>
    </div>
  );
}
