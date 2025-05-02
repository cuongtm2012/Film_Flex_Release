import fetch from "node-fetch";
import { Movie, Episode, MovieListResponse, MovieDetailResponse } from "@shared/schema";

const API_BASE_URL = "https://phimapi.com";

export async function fetchMovieList(page: number = 1): Promise<MovieListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json() as MovieListResponse;
  } catch (error) {
    console.error("Error fetching movie list:", error);
    throw error;
  }
}

export async function fetchMovieDetail(slug: string): Promise<MovieDetailResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/phim/${slug}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json() as MovieDetailResponse;
  } catch (error) {
    console.error(`Error fetching movie detail for slug: ${slug}`, error);
    throw error;
  }
}

export async function searchMovies(keyword: string, page: number = 1): Promise<MovieListResponse> {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const response = await fetch(`${API_BASE_URL}/tim-kiem?keyword=${encodedKeyword}&page=${page}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json() as MovieListResponse;
  } catch (error) {
    console.error(`Error searching movies with keyword: ${keyword}`, error);
    throw error;
  }
}

export async function fetchMoviesByCategory(categorySlug: string, page: number = 1): Promise<MovieListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/the-loai/${categorySlug}?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json() as MovieListResponse;
  } catch (error) {
    console.error(`Error fetching movies for category: ${categorySlug}`, error);
    throw error;
  }
}

export async function fetchMoviesByCountry(countrySlug: string, page: number = 1): Promise<MovieListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/quoc-gia/${countrySlug}?page=${page}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json() as MovieListResponse;
  } catch (error) {
    console.error(`Error fetching movies for country: ${countrySlug}`, error);
    throw error;
  }
}

// Convert API response to Movie model
export function convertToMovieModel(movieDetail: MovieDetailResponse): Movie {
  const movie = movieDetail.movie;
  return {
    id: 0, // Will be set by the database
    movieId: movie._id,
    slug: movie.slug,
    name: movie.name,
    originName: movie.origin_name,
    posterUrl: movie.poster_url,
    thumbUrl: movie.thumb_url,
    year: parseInt(movie.episode_current) || 0,
    type: movie.type === "series" ? "tv" : "movie",
    quality: movie.quality,
    lang: movie.lang,
    time: movie.time,
    view: movie.view,
    description: movie.content,
    status: movie.status,
    trailerUrl: movie.trailer_url,
    categories: movie.category,
    countries: movie.country,
    actors: movie.actor.join(", "),
    directors: movie.director.join(", "),
    modifiedAt: new Date()
  };
}

// Convert API response to Episode models
export function convertToEpisodeModels(movieDetail: MovieDetailResponse): Episode[] {
  const episodes: Episode[] = [];
  const movieSlug = movieDetail.movie.slug;
  
  for (const server of movieDetail.episodes) {
    for (const episode of server.server_data) {
      episodes.push({
        id: 0, // Will be set by the database
        name: episode.name,
        slug: episode.slug,
        movieSlug,
        serverName: server.server_name,
        filename: episode.filename,
        linkEmbed: episode.link_embed,
        linkM3u8: episode.link_m3u8
      });
    }
  }
  
  return episodes;
}
