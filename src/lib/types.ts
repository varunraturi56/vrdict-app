export interface Entry {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: string | null;
  genres: string[];
  poster: string | null;
  overview: string | null;
  tmdb_rating: number | null;
  runtime: number | null;
  seasons: number;
  episodes: number;
  imdb_id: string | null;
  my_rating: number;
  tags: string[];
  recommended: boolean;
  rewatch: boolean;
  year_watched: string | null;
  added_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: string | null;
  genres: string[];
  poster: string | null;
  overview: string | null;
  tmdb_rating: number | null;
  runtime: number | null;
  seasons: number;
  episodes: number;
  imdb_id: string | null;
  added_at: string;
}

export interface CustomTag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export const DEFAULT_TAGS = [
  "Masterpiece",
  "Hidden Gem",
  "Comfort Watch",
  "Mind-Bending",
  "Date Night",
  "Solo Rewatch",
  "Fell Asleep",
  "Overrated",
  "Underrated",
  "Visually Stunning",
  "Great Soundtrack",
  "Slow Burn",
  "Binge-Worthy",
  "With Spouse",
  "Nostalgic",
  "Must Watch",
  "Guilty Pleasure",
] as const;

export const MAJOR_GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Romance",
  "Science Fiction",
  "Thriller",
] as const;

export const MOODS = {
  "Feel Good": {
    emoji: "😊",
    tags: ["Comfort Watch", "Date Night"],
    genres: ["Comedy", "Romance", "Family", "Animation"],
  },
  Intense: {
    emoji: "🧠",
    tags: ["Mind-Bending"],
    genres: ["Thriller", "Horror", "Crime", "Action"],
  },
  Epic: {
    emoji: "⚔️",
    tags: ["Masterpiece", "Visually Stunning", "Must Watch"],
    genres: ["Adventure", "Fantasy", "History", "War"],
  },
  "Chill Night": {
    emoji: "🌙",
    tags: ["Comfort Watch", "Binge-Worthy", "Guilty Pleasure"],
    genres: ["Comedy", "Drama", "Romance"],
  },
  "Hidden Finds": {
    emoji: "💎",
    tags: ["Hidden Gem", "Underrated"],
    genres: [],
  },
} as const;

export const DISCOVER_MOODS = {
  "Feel Good": {
    emoji: "😊",
    genres: ["Comedy", "Romance", "Family", "Animation", "Music"],
  },
  "Mind Bender": {
    emoji: "🧠",
    genres: ["Science Fiction", "Thriller", "Mystery", "Drama"],
  },
  "Edge of Seat": {
    emoji: "😱",
    genres: ["Thriller", "Horror", "Action", "Crime", "Mystery"],
  },
  "Epic Journey": {
    emoji: "⚔️",
    genres: ["Adventure", "Fantasy", "History", "War", "Science Fiction"],
  },
  "Real Stories": {
    emoji: "📖",
    genres: ["Documentary", "Drama", "History"],
  },
  "Wild Ride": {
    emoji: "🎢",
    genres: ["Action", "Adventure", "Science Fiction", "Crime", "Thriller"],
  },
  "Dark & Gritty": {
    emoji: "🌑",
    genres: ["Crime", "Drama", "Thriller", "Horror", "Mystery", "War"],
  },
  "Hidden Gems": {
    emoji: "💎",
    genres: [],
  },
} as const;

export const ERAS = [
  "All",
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "1980s",
  "1970s",
  "1960s",
  "1950s",
] as const;

export type MediaType = "movie" | "tv";
export type ViewMode = "grid" | "compact" | "list";
