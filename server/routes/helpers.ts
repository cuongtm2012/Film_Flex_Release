import { storage } from "../storage.js";
import {
  MovieListResponse,
  MovieDetailResponse,
  type Category,
  type Country,
} from "@shared/schema";

export async function fetchMovieList(page: number, limit: number): Promise<MovieListResponse> {
  const movies = await storage.getMovies(page, limit);
  return {
    status: true,
    items: movies.data,
    pagination: {
      totalItems: movies.total,
      totalPages: Math.ceil(movies.total / limit),
      currentPage: page,
      totalItemsPerPage: limit,
    },
  };
}

export async function fetchMovieDetail(slug: string): Promise<MovieDetailResponse> {
  const movie = await storage.getMovieBySlug(slug);
  if (!movie) {
    throw new Error("Movie not found");
  }
  const episodes = await storage.getEpisodesByMovieSlug(slug);
  return {
    movie: {
      _id: movie.movieId,
      name: movie.name,
      slug: movie.slug,
      origin_name: movie.originName || "",
      content: movie.description || "",
      type: movie.type || "",
      status: movie.status || "",
      thumb_url: movie.thumbUrl || "",
      poster_url: movie.posterUrl || "",
      trailer_url: movie.trailerUrl || undefined,
      time: movie.time || "",
      quality: movie.quality || "",
      lang: movie.lang || "",
      year: movie.year || null,
      episode_current: movie.episodeCurrent || "Full",
      episode_total: movie.episodeTotal || "1",
      view: movie.view || 0,
      actor: movie.actors ? movie.actors.split(", ") : [],
      director: movie.directors ? movie.directors.split(", ") : [],
      category: (movie.categories as Category[]) || [],
      country: (movie.countries as Country[]) || [],
    },
    episodes: episodes.map((ep) => ({
      server_name: ep.serverName,
      server_data: [
        {
          name: ep.name,
          slug: ep.slug,
          filename: ep.filename || "",
          link_embed: ep.linkEmbed,
          link_m3u8: ep.linkM3u8 || "",
        },
      ],
    })),
  };
}

export async function searchMovies(
  query: string,
  normalizedQuery: string,
  page: number,
  limit: number,
  sortBy?: string,
  filters?: { isRecommended?: boolean; type?: string; section?: string }
): Promise<MovieListResponse> {
  if (storage.isElasticsearchEnabled()) {
    try {
      const searchOptions = {
        page,
        limit,
        sortBy: sortBy || "relevance",
        filters: {
          section: filters?.section,
          type: filters?.type,
          isRecommended: filters?.isRecommended,
        },
      };
      const elasticResult = await storage.elasticsearchService?.searchMovies(query, searchOptions);
      if (elasticResult && !elasticResult.error && elasticResult.data) {
        return {
          status: true,
          items: elasticResult.data,
          pagination: {
            totalItems: elasticResult.total,
            totalPages: Math.ceil(elasticResult.total / limit),
            currentPage: page,
            totalItemsPerPage: limit,
          },
        };
      }
    } catch (error) {
      console.warn(
        "[ELASTICSEARCH] Search failed, falling back to PostgreSQL:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  const movies = await storage.searchMovies(query, normalizedQuery, page, limit, sortBy, filters);
  return {
    status: true,
    items: movies.data,
    pagination: {
      totalItems: movies.total,
      totalPages: Math.ceil(movies.total / limit),
      currentPage: page,
      totalItemsPerPage: limit,
    },
  };
}

export async function fetchMoviesByCountry(
  countrySlug: string,
  page: number
): Promise<MovieListResponse> {
  const movies = await storage.getMoviesByCountry(countrySlug, page, 48);
  return {
    status: true,
    items: movies.data,
    pagination: {
      totalItems: movies.total,
      totalPages: Math.ceil(movies.total / 48),
      currentPage: page,
      totalItemsPerPage: 48,
    },
  };
}

export async function fetchRecommendedMovies(
  slug: string,
  limit: number = 10
): Promise<MovieListResponse> {
  try {
    const currentMovie = await storage.getMovieBySlug(slug);
    if (!currentMovie) {
      return {
        status: true,
        items: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          totalItemsPerPage: limit,
        },
      };
    }
    const movieCategories = (currentMovie.categories as any[]) || [];
    if (movieCategories.length === 0) {
      const result = await storage.getRecommendedMovies(1, limit);
      return {
        status: true,
        items: result.data.filter((movie) => movie.slug !== slug).slice(0, limit),
        pagination: {
          totalItems: result.total,
          totalPages: Math.ceil(result.total / limit),
          currentPage: 1,
          totalItemsPerPage: limit,
        },
      };
    }
    const recommendedMovies = await storage.getRecommendedMovies(1, Math.max(50, limit * 3));
    const matchingRecommendations = recommendedMovies.data.filter((movie) => {
      if (movie.slug === slug) return false;
      const movieGenres = (movie.categories as any[]) || [];
      return movieCategories.some((currentGenre) =>
        movieGenres.some(
          (movieGenre) =>
            currentGenre.slug === movieGenre.slug || currentGenre.name === movieGenre.name
        )
      );
    });
    const sortedRecommendations = matchingRecommendations
      .sort(
        (a, b) =>
          new Date(b.modifiedAt || 0).getTime() - new Date(a.modifiedAt || 0).getTime()
      )
      .slice(0, limit);
    return {
      status: true,
      items: sortedRecommendations,
      pagination: {
        totalItems: matchingRecommendations.length,
        totalPages: Math.ceil(matchingRecommendations.length / limit),
        currentPage: 1,
        totalItemsPerPage: limit,
      },
    };
  } catch (error) {
    return {
      status: true,
      items: [],
      pagination: {
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        totalItemsPerPage: limit,
      },
    };
  }
}

export async function processAndSaveMovies(items: any[]): Promise<void> {
  for (const item of items) {
    try {
      if (!item || !item.slug || !item._id) continue;
      const existingMovieById = await storage.getMovieByMovieId(item._id);
      if (existingMovieById) continue;
      const existingMovieBySlug = await storage.getMovieBySlug(item.slug);
      if (existingMovieBySlug) continue;
      await storage.saveMovie({
        movieId: item._id,
        slug: item.slug,
        name: item.name,
        originName: item.origin_name,
        posterUrl: item.poster_url,
        thumbUrl: item.thumb_url,
        year: item.year || 0,
        type: item.tmdb?.type || "movie",
        quality: item.quality || "",
        lang: item.lang || "",
        time: item.time || "",
        view: item.view || 0,
        description: item.content || "",
        status: item.status || "",
        trailerUrl: item.trailer_url || "",
        categories: item.category || [],
        countries: item.country || [],
        actors: item.actor ? item.actor.join(", ") : "",
        directors: item.director ? item.director.join(", ") : "",
      });
    } catch (_error) {
      // skip failed items
    }
  }
}
