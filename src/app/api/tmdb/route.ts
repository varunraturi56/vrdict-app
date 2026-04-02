import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");
  const query = searchParams.get("query");
  const id = searchParams.get("id");
  const mediaType = searchParams.get("media_type") || "movie";
  const page = searchParams.get("page") || "1";

  try {
    let url: string;

    switch (action) {
      case "search":
        if (!query) {
          return NextResponse.json(
            { error: "Query is required" },
            { status: 400 }
          );
        }
        url = `${TMDB_BASE}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`;
        break;

      case "detail":
        if (!id) {
          return NextResponse.json(
            { error: "ID is required" },
            { status: 400 }
          );
        }
        url = `${TMDB_BASE}/${mediaType}/${id}?api_key=${API_KEY}&append_to_response=external_ids`;
        break;

      case "similar":
        if (!id) {
          return NextResponse.json(
            { error: "ID is required" },
            { status: 400 }
          );
        }
        url = `${TMDB_BASE}/${mediaType}/${id}/similar?api_key=${API_KEY}&page=${page}`;
        break;

      case "recommendations":
        if (!id) {
          return NextResponse.json(
            { error: "ID is required" },
            { status: 400 }
          );
        }
        url = `${TMDB_BASE}/${mediaType}/${id}/recommendations?api_key=${API_KEY}&page=${page}`;
        break;

      case "trending":
        url = `${TMDB_BASE}/trending/${mediaType}/week?api_key=${API_KEY}&page=${page}`;
        break;

      case "keyword_search":
        if (!query) {
          return NextResponse.json(
            { error: "Query is required" },
            { status: 400 }
          );
        }
        url = `${TMDB_BASE}/search/keyword?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
        break;

      case "discover": {
        const genreIds = searchParams.get("genre_ids") || "";
        const sortBy = searchParams.get("sort_by") || "popularity.desc";
        const yearGte = searchParams.get("year_gte") || "";
        const yearLte = searchParams.get("year_lte") || "";
        const voteCountGte = searchParams.get("vote_count_gte") || "";
        const voteCountLte = searchParams.get("vote_count_lte") || "";
        const voteAvgGte = searchParams.get("vote_avg_gte") || "";

        const dateField =
          mediaType === "tv" ? "first_air_date" : "primary_release_date";

        let discoverUrl = `${TMDB_BASE}/discover/${mediaType}?api_key=${API_KEY}&page=${page}&sort_by=${sortBy}&include_adult=false`;

        if (genreIds) discoverUrl += `&with_genres=${genreIds}`;
        if (yearGte) discoverUrl += `&${dateField}.gte=${yearGte}-01-01`;
        if (yearLte) discoverUrl += `&${dateField}.lte=${yearLte}-12-31`;
        if (voteCountGte)
          discoverUrl += `&vote_count.gte=${voteCountGte}`;
        if (voteCountLte)
          discoverUrl += `&vote_count.lte=${voteCountLte}`;
        if (voteAvgGte)
          discoverUrl += `&vote_average.gte=${voteAvgGte}`;

        const withKeywords = searchParams.get("with_keywords") || "";
        if (withKeywords) discoverUrl += `&with_keywords=${withKeywords}`;

        url = discoverUrl;
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json(
        { error: `TMDB API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Cache TMDB responses: detail/similar data for 1 hour, discover/search for 5 minutes
    const isStable = action === "detail" || action === "similar" || action === "recommendations";
    const maxAge = isStable ? 3600 : 300;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from TMDB" },
      { status: 500 }
    );
  }
}
