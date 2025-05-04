import fetch from "node-fetch";
import { Movie, Episode, MovieListResponse, MovieDetailResponse, InsertMovie, InsertEpisode, Category } from "@shared/schema";
import { storage } from "../storage";

const API_BASE_URL = "https://phimapi.com";

/**
 * Fetches a list of movies from the external API
 * 
 * @param page Page number (1-based)
 * @param limit Number of items per page
 * @returns A MovieListResponse containing the movie list
 */
export async function fetchMovieList(page: number = 1, limit: number = 50): Promise<MovieListResponse> {
  try {
    console.log(`Fetching movie list for page ${page} with limit ${limit}`);
    
    // The external API returns 10 items per page, but we want to show 50 items per page
    // So we need to fetch 5 pages of data for each of our "pages"
    const pagesNeeded = Math.ceil(limit / 10); // 10 is the number of items per page from external API
    const startPage = (page - 1) * pagesNeeded + 1;
    
    console.log(`Need to fetch ${pagesNeeded} pages starting from external API page ${startPage}`);
    
    // Fetch multiple pages in parallel
    const fetchPromises = [];
    for (let i = 0; i < pagesNeeded; i++) {
      const apiPage = startPage + i;
      console.log(`Fetching page ${apiPage} from external API`);
      
      fetchPromises.push(
        fetch(`${API_BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${apiPage}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`API responded with status: ${response.status}`);
            }
            return response.json() as Promise<MovieListResponse>;
          })
          .then(data => {
            console.log(`Successfully fetched page ${apiPage} with ${data.items.length} items`);
            return data;
          })
      );
    }
    
    // Wait for all requests to complete
    const responses = await Promise.all(fetchPromises);
    
    // Combine the results and slice to get the requested number of items
    const combinedItems = responses.flatMap(response => response.items);
    console.log(`Combined ${combinedItems.length} items from ${responses.length} pages`);
    
    // Calculate total pages based on total items and limit
    const totalItems = parseInt(responses[0].params.pagination.totalItems);
    const totalPages = Math.ceil(totalItems / limit);
    
    console.log(`Pagination: Total items: ${totalItems}, Total pages: ${totalPages}, Current page: ${page}`);
    
    // Create the combined response
    const combinedResponse: MovieListResponse = {
      status: true,
      items: combinedItems.slice(0, limit),
      params: {
        ...responses[0].params,
        pagination: {
          ...responses[0].params.pagination,
          totalItems: totalItems.toString(),
          totalItemsPerPage: limit.toString(),
          currentPage: page.toString(),
          totalPages: totalPages.toString()
        }
      }
    };
    
    console.log(`Returning ${combinedResponse.items.length} items for page ${page}`);
    return combinedResponse;
  } catch (error) {
    console.error('Error fetching movie list:', error);
    // Return an empty response in case of error
    return {
      status: false,
      msg: error instanceof Error ? error.message : 'Unknown error',
      items: [],
      params: {
        pagination: {
          totalItems: "0",
          totalItemsPerPage: limit.toString(),
          currentPage: page.toString(),
          totalPages: "0"
        }
      }
    };
  }
}

/**
 * Fetches movie detail from the external API
 * 
 * @param slug The unique slug identifier for a movie
 * @returns A MovieDetailResponse containing the movie details and episodes
 */
export async function fetchMovieDetail(slug: string): Promise<MovieDetailResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/phim/${slug}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json() as MovieDetailResponse;
    return data;
  } catch (error) {
    console.error(`Error fetching movie detail for slug ${slug}:`, error);
    
    // Return an error response
    return {
      status: false,
      msg: error instanceof Error ? error.message : 'Unknown error',
      movie: null, 
      episodes: []
    };
  }
}

/**
 * Searches for movies using a keyword
 * 
 * @param keyword The search term
 * @param page Page number (1-based)
 * @param limit Number of items per page
 * @returns A MovieListResponse containing the search results
 */
export async function searchMovies(keyword: string, page: number = 1, limit: number = 50): Promise<MovieListResponse> {
  try {
    console.log(`Searching for movies with keyword '${keyword}', page ${page}, limit ${limit}`);
    
    // The external API returns 10 items per page
    const pagesNeeded = Math.ceil(limit / 10);
    const startPage = (page - 1) * pagesNeeded + 1;
    
    // Fetch multiple pages in parallel
    const fetchPromises = [];
    for (let i = 0; i < pagesNeeded; i++) {
      const apiPage = startPage + i;
      
      fetchPromises.push(
        fetch(`${API_BASE_URL}/tim-kiem/${encodeURIComponent(keyword)}?page=${apiPage}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`API responded with status: ${response.status}`);
            }
            return response.json() as Promise<MovieListResponse>;
          })
      );
    }
    
    // Wait for all requests to complete
    const responses = await Promise.all(fetchPromises);
    
    // Combine the results
    const combinedItems = responses.flatMap(response => response.items);
    
    // Get total items and calculate pagination
    const totalItems = parseInt(responses[0].params.pagination.totalItems);
    const totalPages = Math.ceil(totalItems / limit);
    
    // Create the combined response
    const combinedResponse: MovieListResponse = {
      status: true,
      items: combinedItems.slice(0, limit),
      params: {
        ...responses[0].params,
        pagination: {
          ...responses[0].params.pagination,
          totalItems: totalItems.toString(),
          totalItemsPerPage: limit.toString(),
          currentPage: page.toString(),
          totalPages: totalPages.toString()
        }
      }
    };
    
    return combinedResponse;
  } catch (error) {
    console.error('Error searching movies:', error);
    // Return an empty response in case of error
    return {
      status: false,
      msg: error instanceof Error ? error.message : 'Unknown error',
      items: [],
      params: {
        pagination: {
          totalItems: "0",
          totalItemsPerPage: limit.toString(),
          currentPage: page.toString(),
          totalPages: "0"
        }
      }
    };
  }
}

/**
 * Fetches movies by category
 * 
 * @param categorySlug The unique slug for a category
 * @param page Page number (1-based)
 * @param limit Number of items per page
 * @returns A MovieListResponse containing movies in the specified category
 */
export async function fetchMoviesByCategory(categorySlug: string, page: number = 1, limit: number = 50): Promise<MovieListResponse> {
  try {
    console.log(`Fetching movies for category ${categorySlug}, page ${page}, limit ${limit}`);
    
    // The external API returns 10 items per page
    const pagesNeeded = Math.ceil(limit / 10);
    const startPage = (page - 1) * pagesNeeded + 1;
    
    // Check if the category exists first
    console.log(`Checking if category ${categorySlug} exists by fetching page 1`);
    const checkResponse = await fetch(`${API_BASE_URL}/the-loai/${categorySlug}/page-1`);
    
    if (!checkResponse.ok) {
      console.log(`Category ${categorySlug} returned status ${checkResponse.status}, returning empty results`);
      // Category doesn't exist or API error, return empty results
      return {
        status: false,
        msg: `Category not found: ${categorySlug}`,
        items: [],
        params: {
          pagination: {
            totalItems: "0",
            totalItemsPerPage: limit.toString(),
            currentPage: page.toString(),
            totalPages: "0"
          }
        }
      };
    }
    
    // Category exists, fetch multiple pages in parallel
    const fetchPromises = [];
    for (let i = 0; i < pagesNeeded; i++) {
      const apiPage = startPage + i;
      
      fetchPromises.push(
        fetch(`${API_BASE_URL}/the-loai/${categorySlug}/page-${apiPage}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`API responded with status: ${response.status}`);
            }
            return response.json() as Promise<MovieListResponse>;
          })
      );
    }
    
    // Wait for all requests to complete
    const responses = await Promise.all(fetchPromises);
    
    // Combine the results
    const combinedItems = responses.flatMap(response => response.items);
    
    // Get total items and calculate pagination
    const totalItems = parseInt(responses[0].params.pagination.totalItems);
    const totalPages = Math.ceil(totalItems / limit);
    
    // Create the combined response
    const combinedResponse: MovieListResponse = {
      status: true,
      items: combinedItems.slice(0, limit),
      params: {
        ...responses[0].params,
        pagination: {
          ...responses[0].params.pagination,
          totalItems: totalItems.toString(),
          totalItemsPerPage: limit.toString(),
          currentPage: page.toString(),
          totalPages: totalPages.toString()
        }
      }
    };
    
    return combinedResponse;
  } catch (error) {
    console.error(`Error fetching movies for category ${categorySlug}:`, error);
    
    // Return a fallback response
    const fallbackResponse: MovieListResponse = {
      status: false,
      msg: error instanceof Error ? error.message : 'Unknown error',
      items: [],
      params: {
        pagination: {
          totalItems: "0",
          totalItemsPerPage: limit.toString(),
          currentPage: page.toString(),
          totalPages: "0"
        }
      }
    };
    
    return fallbackResponse;
  }
}

/**
 * Fetches movies by country
 * 
 * @param countrySlug The unique slug for a country
 * @param page Page number (1-based)
 * @returns A MovieListResponse containing movies from the specified country
 */
export async function fetchMoviesByCountry(countrySlug: string, page: number = 1): Promise<MovieListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/quoc-gia/${countrySlug}/page-${page}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json() as MovieListResponse;
    return data;
  } catch (error) {
    console.error(`Error fetching movies for country ${countrySlug}:`, error);
    
    // Return a fallback response
    return {
      status: false,
      msg: error instanceof Error ? error.message : 'Unknown error',
      items: [],
      params: {
        pagination: {
          totalItems: "0",
          totalItemsPerPage: "20",
          currentPage: page.toString(),
          totalPages: "0"
        }
      }
    };
  }
}

/**
 * Converts a MovieDetailResponse to an InsertMovie object for database insertion
 */
export function convertToMovieModel(movieDetail: MovieDetailResponse): InsertMovie {
  const movie = movieDetail.movie;
  
  return {
    slug: movie.slug,
    name: movie.name,
    origin_name: movie.origin_name,
    content: movie.content,
    type: movie.type,
    status: movie.status,
    thumb_url: movie.thumb_url,
    poster_url: movie.poster_url,
    is_copyright: movie.is_copyright === "1",
    sub_docquyen: movie.sub_docquyen === "1",
    trailer_url: movie.trailer_url,
    time: movie.time,
    episode_current: movie.episode_current,
    episode_total: movie.episode_total,
    quality: movie.quality,
    lang: movie.lang,
    notify: movie.notify,
    showtimes: movie.showtimes,
    view: parseInt(movie.view),
    view_day: parseInt(movie.view_day),
    view_week: parseInt(movie.view_week),
    view_month: parseInt(movie.view_month),
    year: parseInt(movie.year),
    actor: movie.actor ? movie.actor.join(",") : null,
    director: movie.director ? movie.director.join(",") : null,
    category: JSON.stringify(movie.category),
    country: JSON.stringify(movie.country)
  };
}

/**
 * Converts a MovieDetailResponse to an array of InsertEpisode objects for database insertion
 */
export function convertToEpisodeModels(movieDetail: MovieDetailResponse): InsertEpisode[] {
  const episodes: InsertEpisode[] = [];
  
  if (!movieDetail.episodes || movieDetail.episodes.length === 0) {
    return episodes;
  }
  
  // Add episodes for each server
  movieDetail.episodes.forEach(server => {
    server.server_data.forEach(episode => {
      episodes.push({
        movie_slug: movieDetail.movie.slug,
        server_name: server.server_name,
        name: episode.name,
        slug: episode.slug,
        filename: episode.filename,
        link_embed: episode.link_embed,
        link_m3u8: episode.link_m3u8
      });
    });
  });
  
  return episodes;
}

/**
 * Fetches recommended movies based on a specific movie
 * 
 * @param movieSlug The slug of the movie to get recommendations for
 * @param limit The maximum number of recommendations to return
 * @returns A MovieListResponse containing the recommended movies
 */
export async function fetchRecommendedMovies(movieSlug: string, limit: number = 5): Promise<MovieListResponse> {
  try {
    console.log(`Fetching recommendations for movie ${movieSlug} with limit ${limit}`);
    
    // First, get the movie details to extract categories
    const movieDetail = await storage.getMovieBySlug(movieSlug);
    
    if (!movieDetail) {
      throw new Error(`Movie not found: ${movieSlug}`);
    }
    
    // Generate recommendations based on the movie
    return await generateRecommendations(movieDetail, limit);
  } catch (error) {
    console.error(`Error fetching recommendations for movie ${movieSlug}:`, error);
    
    // Return an empty response in case of error
    return {
      status: false,
      msg: error instanceof Error ? error.message : 'Unknown error',
      items: [],
      params: {
        pagination: {
          totalItems: "0",
          totalItemsPerPage: limit.toString(),
          currentPage: "1",
          totalPages: "0"
        }
      }
    };
  }
}

/**
 * Helper function to generate recommendations based on a movie's categories
 */
async function generateRecommendations(movie: Movie, limit: number): Promise<MovieListResponse> {
  console.log(`Generating recommendations for movie ${movie.slug} with limit ${limit}`);
  
  let recommendedMovies: Movie[] = [];
  
  // Extract categories from the movie
  let categories: Category[] = [];
  try {
    categories = JSON.parse(movie.category as string) as Category[];
    console.log(`Generating recommendations for movie ${movie.slug} with categories: ${categories.map(c => c.name).join(', ')}`);
  } catch (error) {
    console.error(`Error parsing categories for movie ${movie.slug}:`, error);
    categories = [];
  }
  
  // Fetch movies by each category
  for (const category of categories) {
    if (recommendedMovies.length >= limit) break;
    
    try {
      const response = await fetchMoviesByCategory(category.slug, 1, 20);
      
      if (response.status && response.items.length > 0) {
        // Filter out the movie itself and already added recommendations
        const newRecommendations = response.items
          .filter(m => m.slug !== movie.slug)
          .filter(m => !recommendedMovies.some(rm => rm.slug === m.slug));
        
        // Add new recommendations up to the limit
        recommendedMovies = [
          ...recommendedMovies,
          ...newRecommendations.slice(0, limit - recommendedMovies.length)
        ];
      }
    } catch (error) {
      console.error(`Error fetching movies for category ${category.slug}:`, error);
    }
  }
  
  // If we still don't have enough recommendations, add some recent movies
  if (recommendedMovies.length < limit) {
    console.log(`Not enough recommendations (${recommendedMovies.length}), adding recent movies`);
    
    try {
      const response = await fetchMovieList(1, 20);
      
      if (response.status && response.items.length > 0) {
        // Filter out the movie itself and already added recommendations
        const newRecommendations = response.items
          .filter(m => m.slug !== movie.slug)
          .filter(m => !recommendedMovies.some(rm => rm.slug === m.slug));
        
        // Add new recommendations up to the limit
        recommendedMovies = [
          ...recommendedMovies,
          ...newRecommendations.slice(0, limit - recommendedMovies.length)
        ];
      }
    } catch (error) {
      console.error("Error fetching recent movies for recommendations:", error);
    }
  }
  
  console.log(`Returning ${recommendedMovies.length} recommendations for movie ${movie.slug}`);
  
  // Create the response
  const response: MovieListResponse = {
    status: true,
    msg: "",
    items: recommendedMovies.slice(0, limit),
    params: {
      pagination: {
        totalItems: recommendedMovies.length.toString(),
        totalItemsPerPage: limit.toString(),
        currentPage: "1",
        totalPages: "1"
      }
    }
  };
  
  return response;
}