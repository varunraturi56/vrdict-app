export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const POSTER_SIZES = {
  small: `${TMDB_IMAGE_BASE}/w185`,
  medium: `${TMDB_IMAGE_BASE}/w342`,
  large: `${TMDB_IMAGE_BASE}/w500`,
  original: `${TMDB_IMAGE_BASE}/original`,
} as const;

// TMDB genre ID → name mapping (movies + TV)
export const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  // TV-specific
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

// Reverse lookup: name → ID
export const GENRE_IDS: Record<string, number> = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name, Number(id)])
);

// Normalize TV-specific genres to their movie equivalents for consistent filtering
const TV_GENRE_NORMALIZE: Record<string, string> = {
  "Action & Adventure": "Action",
  "Sci-Fi & Fantasy": "Science Fiction",
  "War & Politics": "War",
};

export function normalizeGenres(genres: string[]): string[] {
  return genres.map((g) => TV_GENRE_NORMALIZE[g] || g);
}

export interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv" | "person";
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  vote_average: number;
  overview: string;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  release_date: string;
  genres: { id: number; name: string }[];
  poster_path: string | null;
  overview: string;
  vote_average: number;
  runtime: number;
  imdb_id: string | null;
  external_ids?: { imdb_id: string | null };
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  first_air_date: string;
  genres: { id: number; name: string }[];
  poster_path: string | null;
  overview: string;
  vote_average: number;
  episode_run_time: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  seasons?: { season_number: number; episode_count: number }[];
  external_ids?: { imdb_id: string | null };
}

export function getDisplayTitle(result: TmdbSearchResult): string {
  return result.title || result.name || "Unknown";
}

export function getYear(result: TmdbSearchResult): string {
  const date = result.release_date || result.first_air_date;
  return date ? date.substring(0, 4) : "";
}

export function getGenreNames(genreIds: number[]): string[] {
  return genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
}

export function posterUrl(
  path: string | null,
  size: keyof typeof POSTER_SIZES = "medium"
): string {
  if (!path) return "";
  return `${POSTER_SIZES[size]}${path}`;
}
