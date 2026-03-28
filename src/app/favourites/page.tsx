import { Star } from "lucide-react";

export default function FavouritesPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Star size={22} className="text-vr-violet" />
        <h1 className="font-display text-xl font-semibold text-gradient-vr tracking-wider uppercase">
          Favourites
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

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-2xl border border-border-glow bg-bg-card/50 flex items-center justify-center mb-6">
          <Star size={36} className="text-vr-violet/30" />
        </div>
        <h2 className="font-display text-lg text-[#e8e4dc] tracking-wider mb-2">
          No Favourites Yet
        </h2>
        <p className="font-body text-[#5c5954] text-center max-w-sm">
          Mark entries as favourites in your Library and they&apos;ll appear
          here. Filter by genre, mood, and tags. Share your picks as a
          standalone page.
        </p>
      </div>
    </div>
  );
}
