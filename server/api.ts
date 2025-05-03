import fetch from "node-fetch";
import { Movie, Episode, MovieListResponse, MovieDetailResponse, InsertMovie, InsertEpisode } from "@shared/schema";

const API_BASE_URL = "https://phimapi.com";

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

export async function searchMovies(keyword: string, page: number = 1, limit: number = 50): Promise<MovieListResponse> {
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
    const encodedKeyword = encodeURIComponent(keyword.trim());
    
    // The external API returns ~10 items per page, but we want to show 50 items per page
    const pagesNeeded = Math.ceil(limit / 10); // 10 is the number of items per page from external API
    const startPage = (page - 1) * pagesNeeded + 1;
    
    // Fetch multiple pages in parallel
    const fetchPromises = [];
    for (let i = 0; i < pagesNeeded; i++) {
      const apiPage = startPage + i;
      fetchPromises.push(
        fetch(`${API_BASE_URL}/tim-kiem?keyword=${encodedKeyword}&page=${apiPage}`)
          .then(async response => {
            if (!response.ok) {
              console.warn(`Search API responded with status: ${response.status} for keyword "${keyword}" on page ${apiPage}`);
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
    
    // Combine the items from all pages
    const allItems = pagesData.flatMap(data => data.items || []);
    
    // If no results were found in any page
    if (allItems.length === 0) {
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
    
    // Calculate total items based on the first page's pagination data (if available)
    const firstPagePagination = pagesData[0]?.pagination;
    const totalItems = firstPagePagination?.totalItems || allItems.length;
    const totalPages = firstPagePagination 
      ? Math.ceil(totalItems / limit)
      : Math.ceil(allItems.length / limit);
    
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
  const movie = movieDetail.movie;
  return {
    movieId: movie._id,
    slug: movie.slug,
    name: movie.name,
    originName: movie.origin_name,
    posterUrl: movie.poster_url,
    thumbUrl: movie.thumb_url,
    year: (movie as any).year || 0,
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
    directors: movie.director.join(", ")
    // Note: modifiedAt will be defaulted by the database
  };
}

// Convert API response to Episode models for insertion
export function convertToEpisodeModels(movieDetail: MovieDetailResponse): InsertEpisode[] {
  const episodes: InsertEpisode[] = [];
  const movieSlug = movieDetail.movie.slug;
  
  for (const server of movieDetail.episodes) {
    for (const episode of server.server_data) {
      // Create a globally unique slug by combining movie slug and episode slug
      const uniqueSlug = `${movieSlug}-${episode.slug}`;
      
      episodes.push({
        name: episode.name,
        slug: uniqueSlug,
        movieSlug,
        serverName: server.server_name,
        filename: episode.filename || null,
        linkEmbed: episode.link_embed,
        linkM3u8: episode.link_m3u8 || null
      });
    }
  }
  
  return episodes;
}
