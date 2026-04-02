import { normalizeGenres } from "@/lib/tmdb";
import type { WatchlistItem } from "@/lib/types";

/**
 * Build a watchlist item payload from a TMDB search result + detail response.
 * Used by search page, watchlist page, and discover page add-to-watchlist flows.
 */
export function buildWatchlistItem(
  result: { id: number; media_type: string },
  detail: Record<string, unknown>
): Omit<WatchlistItem, "id" | "user_id" | "added_at"> {
  const isMovie = result.media_type === "movie";

  return {
    tmdb_id: result.id,
    media_type: result.media_type as "movie" | "tv",
    title: (isMovie ? detail.title : detail.name) as string,
    year:
      ((isMovie ? detail.release_date : detail.first_air_date) as string)?.substring(0, 4) || null,
    genres: normalizeGenres(
      ((detail.genres as { name: string }[]) || []).map((g) => g.name)
    ),
    poster: (detail.poster_path as string) || null,
    overview: (detail.overview as string) || null,
    tmdb_rating: Math.round(((detail.vote_average as number) || 0) * 10) / 10,
    runtime: isMovie
      ? (detail.runtime as number) || null
      : ((detail.episode_run_time as number[])?.[0] || 0),
    seasons: isMovie ? 0 : ((detail.number_of_seasons as number) || 0),
    episodes: isMovie ? 0 : ((detail.number_of_episodes as number) || 0),
    imdb_id:
      (detail.imdb_id as string) ||
      (detail.external_ids as { imdb_id?: string })?.imdb_id ||
      null,
  };
}
