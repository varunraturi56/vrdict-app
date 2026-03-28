import { Bookmark } from "lucide-react";

export default function WatchlistPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Bookmark size={22} className="text-neon-green" />
        <h1 className="font-display text-xl font-semibold text-gradient-vr tracking-wider uppercase">
          Watchlist
        </h1>
      </div>

      {/* Sub-tabs placeholder — 3 tabs for Watchlist */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-card/80 border border-border-glow w-fit mb-6">
        <button className="px-4 py-2 rounded-md text-sm font-display uppercase tracking-wider bg-gradient-to-br from-vr-blue to-vr-blue-dark text-white">
          🎬 Movies
        </button>
        <button className="px-4 py-2 rounded-md text-sm font-display uppercase tracking-wider text-[#5c5954] hover:text-[#9a968e] transition-colors">
          📺 TV Shows
        </button>
        <button className="px-4 py-2 rounded-md text-sm font-display uppercase tracking-wider text-[#5c5954] hover:text-[#9a968e] transition-colors">
          🔁 Rewatch
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-2xl border border-border-glow bg-bg-card/50 flex items-center justify-center mb-6">
          <Bookmark size={36} className="text-neon-green/30" />
        </div>
        <h2 className="font-display text-lg text-[#e8e4dc] tracking-wider mb-2">
          Nothing Queued Yet
        </h2>
        <p className="font-body text-[#5c5954] text-center max-w-sm">
          Add films and shows to your watchlist from Discover. When you&apos;ve
          watched them, move them to your Library with a rating.
        </p>
      </div>
    </div>
  );
}
