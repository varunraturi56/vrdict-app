import { normalizeGenres, type TmdbSearchResult } from "@/lib/tmdb";
import type { WatchlistItem } from "@/lib/types";

/**
 * Convert a stored watchlist item back into the search-result shape the
 * AddModal consumes ("Watched — Add to Library" flow). The modal re-fetches
 * full detail from TMDB by id, so only the identity fields need to be exact.
 */
export function watchlistItemToSearchResult(item: WatchlistItem): TmdbSearchResult {
  const isMovie = item.media_type === "movie";
  const date = item.year ? `${item.year}-01-01` : undefined;
  return {
    id: item.tmdb_id,
    media_type: item.media_type,
    title: isMovie ? item.title : undefined,
    name: isMovie ? undefined : item.title,
    release_date: isMovie ? date : undefined,
    first_air_date: isMovie ? undefined : date,
    poster_path: item.poster,
    genre_ids: [],
    vote_average: item.tmdb_rating || 0,
    overview: item.overview || "",
  };
}

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
