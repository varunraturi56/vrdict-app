import { describe, it, expect } from "vitest";
import { buildWatchlistItem } from "@/lib/watchlist-helpers";

const movieResult = { id: 550, media_type: "movie" as const };
const tvResult = { id: 1399, media_type: "tv" as const };

const movieDetail = {
  title: "Fight Club",
  release_date: "1999-10-15",
  genres: [
    { id: 18, name: "Drama" },
    { id: 53, name: "Thriller" },
  ],
  poster_path: "/poster.jpg",
  overview: "A movie about...",
  vote_average: 8.438,
  runtime: 139,
  imdb_id: "tt0137523",
};

const tvDetail = {
  name: "Breaking Bad",
  first_air_date: "2008-01-20",
  genres: [
    { id: 18, name: "Drama" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
  ],
  poster_path: "/bb.jpg",
  overview: "A show about...",
  vote_average: 8.912,
  episode_run_time: [47],
  number_of_seasons: 5,
  number_of_episodes: 62,
  external_ids: { imdb_id: "tt0903747" },
};

describe("buildWatchlistItem", () => {
  it("builds a movie watchlist item", () => {
    const item = buildWatchlistItem(movieResult, movieDetail);
    expect(item.tmdb_id).toBe(550);
    expect(item.media_type).toBe("movie");
    expect(item.title).toBe("Fight Club");
    expect(item.year).toBe("1999");
    expect(item.genres).toEqual(["Drama", "Thriller"]);
    expect(item.poster).toBe("/poster.jpg");
    expect(item.tmdb_rating).toBe(8.4);
    expect(item.runtime).toBe(139);
    expect(item.seasons).toBe(0);
    expect(item.episodes).toBe(0);
    expect(item.imdb_id).toBe("tt0137523");
  });

  it("builds a TV watchlist item with normalized genres", () => {
    const item = buildWatchlistItem(tvResult, tvDetail);
    expect(item.tmdb_id).toBe(1399);
    expect(item.media_type).toBe("tv");
    expect(item.title).toBe("Breaking Bad");
    expect(item.year).toBe("2008");
    expect(item.genres).toEqual(["Drama", "Science Fiction", "Fantasy"]);
    expect(item.runtime).toBe(47);
    expect(item.seasons).toBe(5);
    expect(item.episodes).toBe(62);
    expect(item.imdb_id).toBe("tt0903747");
  });

  it("handles missing detail fields gracefully", () => {
    const item = buildWatchlistItem(movieResult, {});
    expect(item.title).toBeUndefined();
    expect(item.year).toBeNull();
    expect(item.genres).toEqual([]);
    expect(item.poster).toBeNull();
    expect(item.tmdb_rating).toBe(0);
    expect(item.runtime).toBeNull();
    expect(item.imdb_id).toBeNull();
  });

  it("rounds TMDB rating to 1 decimal place", () => {
    const item = buildWatchlistItem(movieResult, { vote_average: 7.777 });
    expect(item.tmdb_rating).toBe(7.8);
  });

  it("extracts imdb_id from external_ids fallback", () => {
    const item = buildWatchlistItem(movieResult, {
      external_ids: { imdb_id: "tt9999999" },
    });
    expect(item.imdb_id).toBe("tt9999999");
  });
});
