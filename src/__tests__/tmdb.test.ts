import { describe, it, expect } from "vitest";
import {
  normalizeGenres,
  genreMatchesFilter,
  getGenreIdForMediaType,
  getGenreNames,
  getDisplayTitle,
  getYear,
  posterUrl,
  GENRE_MAP,
  GENRE_IDS,
  type TmdbSearchResult,
} from "@/lib/tmdb";

// ─── normalizeGenres ───

describe("normalizeGenres", () => {
  it("passes through standard movie genres unchanged", () => {
    expect(normalizeGenres(["Action", "Drama"])).toEqual(["Action", "Drama"]);
  });

  it("expands 'Sci-Fi & Fantasy' into both components", () => {
    expect(normalizeGenres(["Sci-Fi & Fantasy"])).toEqual([
      "Science Fiction",
      "Fantasy",
    ]);
  });

  it("expands 'Action & Adventure' into both components", () => {
    expect(normalizeGenres(["Action & Adventure"])).toEqual([
      "Action",
      "Adventure",
    ]);
  });

  it("maps 'War & Politics' to 'War'", () => {
    expect(normalizeGenres(["War & Politics"])).toEqual(["War"]);
  });

  it("maps 'Kids' to 'Family'", () => {
    expect(normalizeGenres(["Kids"])).toEqual(["Family"]);
  });

  it("deduplicates when expansion overlaps with existing genres", () => {
    expect(normalizeGenres(["Action", "Action & Adventure"])).toEqual([
      "Action",
      "Adventure",
    ]);
  });

  it("handles mixed movie and TV genres", () => {
    const result = normalizeGenres([
      "Drama",
      "Sci-Fi & Fantasy",
      "Comedy",
    ]);
    expect(result).toEqual(["Drama", "Science Fiction", "Fantasy", "Comedy"]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeGenres([])).toEqual([]);
  });

  it("passes through unknown genres unchanged", () => {
    expect(normalizeGenres(["News", "Reality"])).toEqual(["News", "Reality"]);
  });
});

// ─── genreMatchesFilter ───

describe("genreMatchesFilter", () => {
  it("matches a direct genre", () => {
    expect(genreMatchesFilter(["Action", "Drama"], "Action")).toBe(true);
  });

  it("matches after normalizing TV genre", () => {
    expect(
      genreMatchesFilter(["Sci-Fi & Fantasy", "Drama"], "Science Fiction")
    ).toBe(true);
  });

  it("matches the secondary component of a combined genre", () => {
    expect(
      genreMatchesFilter(["Sci-Fi & Fantasy"], "Fantasy")
    ).toBe(true);
  });

  it("returns false for non-matching genre", () => {
    expect(genreMatchesFilter(["Action", "Drama"], "Horror")).toBe(false);
  });

  it("returns false for undefined genres", () => {
    expect(genreMatchesFilter(undefined, "Action")).toBe(false);
  });

  it("returns false for empty genres array", () => {
    expect(genreMatchesFilter([], "Action")).toBe(false);
  });
});

// ─── getGenreIdForMediaType ───

describe("getGenreIdForMediaType", () => {
  it("returns movie genre ID for movies", () => {
    expect(getGenreIdForMediaType("Action", "movie")).toBe("28");
  });

  it("returns TV genre ID for TV 'Action'", () => {
    expect(getGenreIdForMediaType("Action", "tv")).toBe("10759");
  });

  it("returns TV genre ID for TV 'Science Fiction'", () => {
    expect(getGenreIdForMediaType("Science Fiction", "tv")).toBe("10765");
  });

  it("returns TV genre ID for TV 'Fantasy'", () => {
    expect(getGenreIdForMediaType("Fantasy", "tv")).toBe("10765");
  });

  it("returns movie ID for genres with no TV mapping", () => {
    expect(getGenreIdForMediaType("Comedy", "tv")).toBe("35");
  });

  it("returns empty string for unknown genre", () => {
    expect(getGenreIdForMediaType("NonExistent", "movie")).toBe("");
  });
});

// ─── getGenreNames ───

describe("getGenreNames", () => {
  it("maps genre IDs to names", () => {
    expect(getGenreNames([28, 18])).toEqual(["Action", "Drama"]);
  });

  it("normalizes TV genre IDs", () => {
    expect(getGenreNames([10765, 18])).toEqual([
      "Science Fiction",
      "Fantasy",
      "Drama",
    ]);
  });

  it("filters out unknown genre IDs", () => {
    expect(getGenreNames([28, 99999])).toEqual(["Action"]);
  });

  it("returns empty array for empty input", () => {
    expect(getGenreNames([])).toEqual([]);
  });
});

// ─── getDisplayTitle ───

describe("getDisplayTitle", () => {
  const base: TmdbSearchResult = {
    id: 1,
    media_type: "movie",
    poster_path: null,
    genre_ids: [],
    vote_average: 0,
    overview: "",
  };

  it("returns title for movies", () => {
    expect(getDisplayTitle({ ...base, title: "Inception" })).toBe("Inception");
  });

  it("returns name for TV shows", () => {
    expect(
      getDisplayTitle({ ...base, media_type: "tv", name: "Breaking Bad" })
    ).toBe("Breaking Bad");
  });

  it("prefers title over name", () => {
    expect(
      getDisplayTitle({ ...base, title: "Movie", name: "Show" })
    ).toBe("Movie");
  });

  it("returns 'Unknown' when neither exists", () => {
    expect(getDisplayTitle(base)).toBe("Unknown");
  });
});

// ─── getYear ───

describe("getYear", () => {
  const base: TmdbSearchResult = {
    id: 1,
    media_type: "movie",
    poster_path: null,
    genre_ids: [],
    vote_average: 0,
    overview: "",
  };

  it("extracts year from release_date", () => {
    expect(getYear({ ...base, release_date: "2010-07-16" })).toBe("2010");
  });

  it("extracts year from first_air_date", () => {
    expect(getYear({ ...base, first_air_date: "2008-01-20" })).toBe("2008");
  });

  it("prefers release_date over first_air_date", () => {
    expect(
      getYear({ ...base, release_date: "2010-07-16", first_air_date: "2008-01-20" })
    ).toBe("2010");
  });

  it("returns empty string when no date", () => {
    expect(getYear(base)).toBe("");
  });
});

// ─── posterUrl ───

describe("posterUrl", () => {
  it("builds medium poster URL by default", () => {
    expect(posterUrl("/abc.jpg")).toBe(
      "https://image.tmdb.org/t/p/w342/abc.jpg"
    );
  });

  it("builds small poster URL", () => {
    expect(posterUrl("/abc.jpg", "small")).toBe(
      "https://image.tmdb.org/t/p/w185/abc.jpg"
    );
  });

  it("returns empty string for null path", () => {
    expect(posterUrl(null)).toBe("");
  });
});

// ─── GENRE_MAP / GENRE_IDS consistency ───

describe("genre maps consistency", () => {
  it("GENRE_IDS is inverse of GENRE_MAP", () => {
    for (const [id, name] of Object.entries(GENRE_MAP)) {
      expect(GENRE_IDS[name]).toBe(Number(id));
    }
  });

  it("contains all major movie genres", () => {
    const majorGenres = [
      "Action", "Adventure", "Animation", "Comedy", "Crime",
      "Documentary", "Drama", "Fantasy", "Horror", "Romance",
      "Science Fiction", "Thriller",
    ];
    for (const g of majorGenres) {
      expect(GENRE_IDS[g]).toBeDefined();
    }
  });

  it("contains all TV-specific genres", () => {
    const tvGenres = [
      "Action & Adventure", "Kids", "News", "Reality",
      "Sci-Fi & Fantasy", "Soap", "Talk", "War & Politics",
    ];
    for (const g of tvGenres) {
      expect(GENRE_IDS[g]).toBeDefined();
    }
  });
});
