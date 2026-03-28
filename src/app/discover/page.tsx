import { Radar } from "lucide-react";

export default function DiscoverPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Radar size={22} className="text-neon-cyan" />
        <h1 className="font-display text-xl font-semibold text-gradient-vr tracking-wider uppercase">
          Discover
        </h1>
        <span className="font-display text-[9px] uppercase tracking-[0.2em] text-vr-violet/60 ml-1">
          VRadar
        </span>
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

      {/* Filter pills placeholder */}
      <div className="space-y-3 mb-6">
        {/* Genres */}
        <div className="flex flex-wrap gap-2">
          {["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Thriller"].map(
            (genre) => (
              <span
                key={genre}
                className="px-3 py-1.5 rounded-full text-xs font-display uppercase tracking-wider border border-border-glow bg-bg-card/50 text-[#5c5954]"
              >
                {genre}
              </span>
            )
          )}
        </div>

        {/* Moods */}
        <div className="flex flex-wrap gap-2">
          {[
            "😊 Feel Good",
            "🧠 Mind Bender",
            "😱 Edge of Seat",
            "⚔️ Epic Journey",
            "📖 Real Stories",
            "🎢 Wild Ride",
            "🌑 Dark & Gritty",
            "💎 Hidden Gems",
          ].map((mood) => (
            <span
              key={mood}
              className="px-3 py-1.5 rounded-full text-xs font-display uppercase tracking-wider border border-vr-violet/20 bg-vr-violet/5 text-[#5c5954]"
            >
              {mood}
            </span>
          ))}
        </div>

        {/* Eras */}
        <div className="flex flex-wrap gap-2">
          {["All", "2020s", "2010s", "2000s", "1990s", "1980s"].map((era) => (
            <span
              key={era}
              className="px-3 py-1.5 rounded-full text-xs font-display uppercase tracking-wider border border-border-glow bg-bg-card/50 text-[#5c5954]"
            >
              {era}
            </span>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 rounded-2xl border border-border-glow bg-bg-card/50 flex items-center justify-center mb-6">
          <Radar size={36} className="text-neon-cyan/30" />
        </div>
        <h2 className="font-display text-lg text-[#e8e4dc] tracking-wider mb-2">
          Discover Something New
        </h2>
        <p className="font-body text-[#5c5954] text-center max-w-sm">
          Browse trending titles, filter by genre, mood, and era. Add to your
          library or queue to your watchlist.
        </p>
      </div>
    </div>
  );
}
