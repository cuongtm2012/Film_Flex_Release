import fetch from "node-fetch";
import { Movie, Episode, MovieListResponse, MovieDetailResponse, InsertMovie, InsertEpisode, Category } from "@shared/schema";
import { storage } from "./storage";

const API_BASE_URL = "https://ophim1.com";

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
            console.log(`Successfully fetched page ${apiPage} with ${data.items?.length || 0} items`);
            return data;
          })
          .catch(err => {
            console.error(`Error fetching page ${apiPage}:`, err);
            // Return an empty response for this page if it fails
            return { status: false, items: [] } as MovieListResponse;
          })
      );
    }
    
    // Wait for all fetch requests to complete
    const pagesData = await Promise.all(fetchPromises);
    
    // Combine the items from all pages
    const allItems = pagesData.flatMap(data => data.items || []);
    console.log(`Combined ${allItems.length} items from ${pagesData.length} pages`);
    
    // Calculate total items based on the first page's pagination data (if available)
    const firstPagePagination = pagesData[0]?.pagination;
    const totalItems = firstPagePagination?.totalItems || allItems.length;
    const totalPages = firstPagePagination 
      ? Math.ceil(totalItems / limit)
      : Math.ceil(allItems.length / limit);
    
    console.log(`Pagination: Total items: ${totalItems}, Total pages: ${totalPages}, Current page: ${page}`);
    
    // Create the combined response
    const combinedResponse: MovieListResponse = {
      status: true,
      items: allItems.slice(0, limit), // Only return the requested number of items
      pagination: {
        totalItems: totalItems,
        totalPages: totalPages,
        currentPage: page,
        totalItemsPerPage: limit
      }
    };
    
    console.log(`Returning ${combinedResponse.items.length} items for page ${page}`);
    return combinedResponse;
  } catch (error) {
    console.error("Error fetching movie list:", error);
    throw error;
  }
}

// Helper function to retry fetch operations
async function fetchWithRetries<T>(url: string, maxRetries: number = 3, initialDelay: number = 1000): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const statusError = new Error(`API responded with status: ${response.status} for URL: ${url}`);
        
        // If it's a 404, no need to retry
        if (response.status === 404) {
          throw statusError;
        }
        
        // For other errors, log and retry
        console.warn(`Attempt ${attempt}/${maxRetries} failed: ${statusError.message}`);
        lastError = statusError;
      } else {
        // Parse the JSON response
        try {
          const data = await response.json();
          return data as T;
        } catch (jsonError) {
          console.error(`Error parsing JSON on attempt ${attempt}/${maxRetries}:`, jsonError);
          lastError = jsonError as Error;
        }
      }
    } catch (fetchError) {
      console.error(`Fetch error on attempt ${attempt}/${maxRetries}:`, fetchError);
      lastError = fetchError as Error;
    }
    
    // If this wasn't the last attempt, wait before retrying
    if (attempt < maxRetries) {
      const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we got here, all retries failed
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

export async function fetchMovieDetail(slug: string): Promise<MovieDetailResponse> {
  try {
    // Use the retry mechanism
    const data = await fetchWithRetries<MovieDetailResponse>(
      `${API_BASE_URL}/phim/${slug}`,
      3, // max retries
      1000 // initial delay
    );
    
    // Some basic validation of the response
    if (!data) {
      return { status: false, msg: "Empty response", movie: null } as MovieDetailResponse;
    }
    
    // Check if the API returned a not found or error response
    if (data.status === false || !data.movie) {
      return { 
        status: false, 
        msg: data.msg || "Movie not found", 
        movie: null 
      } as MovieDetailResponse;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching movie detail for slug: ${slug}`, error);
    // Return an error response instead of throwing
    return { 
      status: false, 
      msg: error instanceof Error ? error.message : "Unknown error", 
      movie: null 
    } as MovieDetailResponse;
  }
}

/**
 * Function to normalize Vietnamese text by removing accents and diacritics
 * This helps with search functionality where users might type without accents
 */
function normalizeText(text: string): string {
  if (!text) return '';
  
  // Normalize to NFD form where accented chars are separated into base char + accent
  return text.normalize('NFD')
    // Remove combining diacritical marks (accents, etc.)
    .replace(/[\u0300-\u036f]/g, '')
    // Remove other special characters and normalize to lowercase
    .toLowerCase()
    // Replace đ/Đ with d
    .replace(/[đĐ]/g, 'd');
}

export async function searchMovies(keyword: string, normalizedQuery: string | null = null, page: number = 1, limit: number = 50): Promise<MovieListResponse> {
  if (!keyword || keyword.trim() === "") {
    return { 
      status: true, 
      items: [], 
      pagination: { 
        totalPages: 0, 
        totalItems: 0, 
        currentPage: page, 
        totalItemsPerPage: limit 
      } 
    };
  }
  
  try {
    const trimmedKeyword = keyword.trim();
    // If normalizedQuery is provided, use it, otherwise normalize the trimmed keyword
    const normalizedKeyword = normalizedQuery || normalizeText(trimmedKeyword);
    console.log(`Searching for "${trimmedKeyword}" in page ${page} with limit ${limit}`);
    
    // First, search in our local storage/database
    const localResults = await storage.searchMovies(trimmedKeyword, normalizedKeyword, 1, 1000); // Get all matches
    console.log(`Local search found ${localResults.data.length} matches for "${trimmedKeyword}"`);
    
    // Format local results to match MovieListResponse expected format
    const formattedLocalResults = localResults.data.map(movie => ({
      _id: movie.movieId,
      name: movie.name,
      origin_name: movie.originName || "",
      slug: movie.slug,
      type: movie.type === "tv" ? "series" : "single",
      thumb_url: movie.thumbUrl || "",
      poster_url: movie.posterUrl || "",
      year: (movie.year || 0).toString(),
      category: movie.categories || [],
      country: movie.countries || [],
    }));
    
    // Try to search in the external API as well
    const encodedKeyword = encodeURIComponent(trimmedKeyword);
    const pagesNeeded = Math.ceil(limit / 10); // 10 is the number of items per page from external API
    const startPage = (page - 1) * pagesNeeded + 1;
    
    // Define an explicit type for API results
    let apiResults: Array<{
      _id: string;
      name: string;
      origin_name: string;
      slug: string;
      type: string;
      thumb_url: string;
      poster_url: string;
      year: string;
      category: any[];
      country: any[];
    }> = [];
    
    try {
      // Fetch multiple pages in parallel
      const fetchPromises = [];
      for (let i = 0; i < pagesNeeded; i++) {
        const apiPage = startPage + i;
        fetchPromises.push(
          fetch(`${API_BASE_URL}/tim-kiem?keyword=${encodedKeyword}&page=${apiPage}`)
            .then(async response => {
              if (!response.ok) {
                console.warn(`Search API responded with status: ${response.status} for keyword "${trimmedKeyword}" on page ${apiPage}`);
                return { status: false, items: [] } as MovieListResponse;
              }
              try {
                return await response.json() as MovieListResponse;
              } catch (err) {
                console.error(`Error parsing JSON for search page ${apiPage}:`, err);
                return { status: false, items: [] } as MovieListResponse;
              }
            })
            .catch(err => {
              console.error(`Error fetching search page ${apiPage}:`, err);
              return { status: false, items: [] } as MovieListResponse;
            })
        );
      }
      
      // Wait for all fetch requests to complete
      const pagesData = await Promise.all(fetchPromises);
      
      // Combine the items from all API pages
      apiResults = pagesData.flatMap(data => data.items || []);
      console.log(`API search found ${apiResults.length} matches for "${trimmedKeyword}"`);
    } catch (apiError) {
      console.error(`Error searching external API:`, apiError);
      // Continue with local results only
    }
    
    // Combine local and API results, removing duplicates by slug
    const slugMap = new Map<string, any>();
    
    // Add local results first (higher priority)
    formattedLocalResults.forEach(item => {
      slugMap.set(item.slug, item);
    });
    
    // Add API results that don't duplicate local ones
    apiResults.forEach(item => {
      if (!slugMap.has(item.slug)) {
        slugMap.set(item.slug, item);
      }
    });
    
    // Convert map to array
    const allItems = Array.from(slugMap.values());
    
    // If no results were found
    if (allItems.length === 0) {
      console.log(`No results found for "${trimmedKeyword}" in either local or API search`);
      return { 
        status: true, 
        items: [], 
        pagination: { 
          totalPages: 0, 
          totalItems: 0, 
          currentPage: page, 
          totalItemsPerPage: limit 
        } 
      };
    }
    
    // Calculate paginated results
    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    const paginatedItems = allItems.slice(startIndex, endIndex);
    
    console.log(`Combined search returned ${totalItems} total results, showing ${paginatedItems.length} items for page ${page}`);
    
    // Create the combined response
    const combinedResponse: MovieListResponse = {
      status: true,
      items: paginatedItems,
      pagination: {
        totalItems: totalItems,
        totalPages: totalPages,
        currentPage: page,
        totalItemsPerPage: limit
      }
    };
    
    return combinedResponse;
  } catch (error) {
    console.error(`Error searching movies with keyword: ${keyword}`, error);
    // Return empty results instead of throwing an error
    return { 
      status: true, 
      items: [], 
      pagination: { 
        totalPages: 0, 
        totalItems: 0, 
        currentPage: page, 
        totalItemsPerPage: limit 
      } 
    };
  }
}

export async function fetchMoviesByCategory(categorySlug: string, page: number = 1, limit: number = 50): Promise<MovieListResponse> {
  try {
    console.log(`Fetching movies for category ${categorySlug}, page ${page}, limit ${limit}`);
    
    // If it's the "all" category, just return all movies
    if (categorySlug === 'all') {
      console.log(`Using all movies list for 'all' category`);
      return await fetchMovieList(page, limit);
    }
    
    // The external API returns ~10 items per page, but we want to show 50 items per page
    // So we need to fetch multiple pages of data for each of our "pages"
    const pagesNeeded = Math.ceil(limit / 10); // 10 is the number of items per page from external API
    const startPage = (page - 1) * pagesNeeded + 1;
    
    console.log(`Need to fetch ${pagesNeeded} pages starting from external API page ${startPage}`);
    
    try {
      // Fetch one page first to check if the category exists
      // Try with '/category' endpoint instead of '/the-loai'
      console.log(`Checking if category ${categorySlug} exists by fetching page 1`);
      const testResponse = await fetch(`${API_BASE_URL}/category/${categorySlug}?page=1`);
      
      // If the category doesn't exist, return empty results early
      if (!testResponse.ok) {
        console.log(`Category ${categorySlug} returned status ${testResponse.status}, returning empty results`);
        // Return empty results with proper pagination
        return {
          status: true,
          items: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: page,
            totalItemsPerPage: limit
          }
        };
      }
      
      // If we get here, the category exists, so fetch multiple pages in parallel
      const fetchPromises = [];
      for (let i = 0; i < pagesNeeded; i++) {
        const apiPage = startPage + i;
        console.log(`Fetching category ${categorySlug} page ${apiPage}`);
        
        fetchPromises.push(
          fetch(`${API_BASE_URL}/category/${categorySlug}?page=${apiPage}`)
            .then(response => {
              if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
              }
              return response.json() as Promise<MovieListResponse>;
            })
            .then(data => {
              console.log(`Successfully fetched category ${categorySlug} page ${apiPage} with ${data.items?.length || 0} items`);
              return data;
            })
            .catch(err => {
              console.error(`Error fetching category ${categorySlug} page ${apiPage}:`, err);
              // Return an empty response for this page if it fails
              return { status: false, items: [] } as MovieListResponse;
            })
        );
      }
      
      // Wait for all fetch requests to complete
      const pagesData = await Promise.all(fetchPromises);
      
      // Combine the items from all pages
      const allItems = pagesData.flatMap(data => data.items || []);
      console.log(`Combined ${allItems.length} items from ${pagesData.length} pages for category ${categorySlug}`);
      
      // Calculate total items based on the first page's pagination data (if available)
      const firstPagePagination = pagesData[0]?.pagination;
      const totalItems = firstPagePagination?.totalItems || allItems.length;
      const totalPages = firstPagePagination 
        ? Math.ceil(totalItems / limit)
        : Math.ceil(allItems.length / limit);
      
      console.log(`Pagination for category ${categorySlug}: Total items: ${totalItems}, Total pages: ${totalPages}, Current page: ${page}`);
      
      // Create the combined response
      const combinedResponse: MovieListResponse = {
        status: true,
        items: allItems.slice(0, limit), // Only return the requested number of items
        pagination: {
          totalItems: totalItems,
          totalPages: totalPages,
          currentPage: page,
          totalItemsPerPage: limit
        }
      };
      
      console.log(`Returning ${combinedResponse.items.length} items for category ${categorySlug} page ${page}`);
      return combinedResponse;
    } catch (categoryError) {
      console.error(`Error fetching movies for category ${categorySlug}:`, categoryError);
      
      console.log(`Using fallback to fetch all movies and filter by category`);
      // Fallback to regular movie list if something goes wrong
      const allMoviesResponse = await fetchMovieList(page, limit);
      
      // Return all movies but with appropriate metadata
      const fallbackResponse: MovieListResponse = {
        status: true,
        items: allMoviesResponse.items,
        pagination: {
          totalItems: allMoviesResponse.pagination?.totalItems || 0,
          totalPages: allMoviesResponse.pagination?.totalPages || 1,
          currentPage: page,
          totalItemsPerPage: limit
        }
      };
      
      return fallbackResponse;
    }
  } catch (error) {
    console.error(`Error fetching movies for category ${categorySlug}:`, error);
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

// Convert API response to Movie model for insertion
export function convertToMovieModel(movieDetail: MovieDetailResponse): InsertMovie {
  // Check if the movie details exist and are valid
  if (!movieDetail || !movieDetail.movie) {
    throw new Error("Cannot convert invalid movie details to model");
  }
  
  const movie = movieDetail.movie;
  
  // Get movie ID - either from direct _id or from tmdb.id as a fallback
  const movieId = movie._id || 
                 (movie.tmdb && movie.tmdb.id ? `tmdb-${movie.tmdb.id}` : null);
  
  // Check if we have enough info to create a valid movie record
  if (!movieId || !movie.slug || !movie.name) {
    throw new Error(`Movie is missing required fields: ${JSON.stringify({
      id: movieId || "missing",
      slug: movie.slug || "missing",
      name: movie.name || "missing"
    })}`);
  }
  
  // Extract the year from the name if not provided
  let year = 0;
  if ((movie as any).year) {
    year = parseInt((movie as any).year) || 0;
  } else {
    // Try to extract year from name like "Movie Name (2023)"
    const yearMatch = movie.name.match(/\((\d{4})\)$/);
    if (yearMatch && yearMatch[1]) {
      year = parseInt(yearMatch[1]);
    }
  }
  
  return {
    movieId: movieId,
    slug: movie.slug,
    name: movie.name,
    originName: movie.origin_name || "",
    posterUrl: movie.poster_url || "",
    thumbUrl: movie.thumb_url || "",
    year: year,
    type: (movie.tmdb && movie.tmdb.type === "tv") ? "tv" : "movie",
    quality: movie.quality || "",
    lang: movie.lang || "",
    time: movie.time || "",
    view: movie.view || 0,
    description: movie.content || "",
    status: movie.status || "ongoing",
    trailerUrl: movie.trailer_url || "",
    categories: movie.category || [],
    countries: movie.country || [],
    actors: Array.isArray(movie.actor) ? movie.actor.join(", ") : "",
    directors: Array.isArray(movie.director) ? movie.director.join(", ") : ""
    // Note: modifiedAt will be defaulted by the database
  };
}

// Convert API response to Episode models for insertion
export function convertToEpisodeModels(movieDetail: MovieDetailResponse): InsertEpisode[] {
  const episodes: InsertEpisode[] = [];
  
  // Check if movie details exist and are valid
  if (!movieDetail || !movieDetail.movie || !movieDetail.movie.slug) {
    console.warn("Cannot convert episodes from invalid movie details");
    return episodes;
  }
  
  // Check if episodes exist
  if (!movieDetail.episodes || !Array.isArray(movieDetail.episodes)) {
    console.warn(`No episodes found for movie ${movieDetail.movie.slug}`);
    return episodes;
  }
  
  const movieSlug = movieDetail.movie.slug;
  
  for (const server of movieDetail.episodes) {
    // Skip if server_data doesn't exist or isn't an array
    if (!server.server_data || !Array.isArray(server.server_data)) {
      continue;
    }
    
    for (const episode of server.server_data) {
      // Skip episodes without required fields
      if (!episode || !episode.slug) {
        continue;
      }
      
      // Create a globally unique slug by combining movie slug and episode slug
      const uniqueSlug = `${movieSlug}-${episode.slug}`;
      
      episodes.push({
        name: episode.name || `Episode ${episode.slug}`,
        slug: uniqueSlug,
        movieSlug,
        serverName: server.server_name || "default",
        filename: episode.filename || null,
        linkEmbed: episode.link_embed || "",
        linkM3u8: episode.link_m3u8 || null
      });
    }
  }
  
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
    console.log(`Generating recommendations for movie ${movieSlug} with limit ${limit}`);
    
    // First, get the movie details to get its categories
    const movieDetailData = await storage.getMovieBySlug(movieSlug);
    
    if (!movieDetailData) {
      console.log(`Movie ${movieSlug} not found in storage, attempting to fetch from API`);
      try {
        const apiDetail = await fetchMovieDetail(movieSlug);
        if (apiDetail && apiDetail.movie) {
          const movieModel = convertToMovieModel(apiDetail);
          await storage.saveMovie(movieModel);
          
          // Get the saved movie
          const savedMovie = await storage.getMovieBySlug(movieSlug);
          if (savedMovie) {
            return generateRecommendations(savedMovie, limit);
          }
        }
      } catch (error) {
        console.error(`Error fetching movie detail for recommendations: ${error}`);
        return { 
          status: true, 
          items: [], 
          pagination: { 
            totalItems: 0, 
            totalPages: 0, 
            currentPage: 1, 
            totalItemsPerPage: limit 
          } 
        };
      }
    } else {
      return generateRecommendations(movieDetailData, limit);
    }
    
    // If we couldn't get the movie, return empty recommendations
    console.log(`Could not find or fetch movie ${movieSlug} for recommendations`);
    return { 
      status: true, 
      items: [], 
      pagination: { 
        totalItems: 0, 
        totalPages: 0, 
        currentPage: 1, 
        totalItemsPerPage: limit 
      } 
    };
  } catch (error) {
    console.error(`Error generating movie recommendations for ${movieSlug}:`, error);
    return { 
      status: true, 
      items: [], 
      pagination: { 
        totalItems: 0, 
        totalPages: 0, 
        currentPage: 1, 
        totalItemsPerPage: limit 
      } 
    };
  }
}

/**
 * Helper function to generate recommendations based on a movie's categories
 */
async function generateRecommendations(movie: Movie, limit: number): Promise<MovieListResponse> {
  // Get the categories from the movie
  const movieCategories = movie.categories as any[] || [];
  const categoryNames = movieCategories.map(c => c.name || c.slug).filter(Boolean);
  
  console.log(`Generating recommendations for movie ${movie.slug} with categories:`, 
    categoryNames.join(', '));
  
  // Strategy 1: Find movies with matching categories
  let recommendedMovies: any[] = [];
  
  // If we have categories, try to find movies in those categories
  if (movieCategories.length > 0) {
    // For each category, try to find movies
    for (const category of movieCategories) {
      // Skip if the category has no slug
      if (!category.slug) continue;
      
      try {
        // Try to get movies from this category
        const categoryMovies = await fetchMoviesByCategory(category.slug, 1, 20);
        if (categoryMovies && categoryMovies.items && categoryMovies.items.length > 0) {
          // Add movies from this category to recommendations, but exclude the current movie
          categoryMovies.items.forEach(item => {
            if (item.slug !== movie.slug) {
              recommendedMovies.push(item);
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching movies from category ${category.slug}:`, error);
        // Continue with other categories
      }
      
      // Break if we have enough recommendations
      if (recommendedMovies.length >= limit * 2) {
        break;
      }
    }
  }
  
  // Strategy 2: If we don't have enough recommendations, add some recent movies
  if (recommendedMovies.length < limit) {
    console.log(`Not enough recommendations (${recommendedMovies.length}), adding recent movies`);
    try {
      const recentMovies = await fetchMovieList(1, 20);
      if (recentMovies && recentMovies.items && recentMovies.items.length > 0) {
        recentMovies.items.forEach(item => {
          if (item.slug !== movie.slug) {
            recommendedMovies.push(item);
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching recent movies for recommendations:`, error);
    }
  }
  
  // Deduplicate recommendations by slug
  const uniqueRecommendations = Array.from(
    new Map(recommendedMovies.map(item => [item.slug, item])).values()
  );
  
  // Limit to requested number
  const limitedRecommendations = uniqueRecommendations.slice(0, limit);
  
  // Create the response
  const response: MovieListResponse = {
    status: true,
    items: limitedRecommendations,
    pagination: {
      totalItems: limitedRecommendations.length,
      totalPages: 1,
      currentPage: 1,
      totalItemsPerPage: limit
    }
  };
  
  console.log(`Returning ${limitedRecommendations.length} recommendations for movie ${movie.slug}`);
  return response;
}
