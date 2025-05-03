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
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    
    // The external API returns ~10 items per page, but we want to show 50 items per page
    const pagesNeeded = Math.ceil(limit / 10); // 10 is the number of items per page from external API
    const startPage = (page - 1) * pagesNeeded + 1;
    
    // Fetch multiple pages in parallel
    const fetchPromises = [];
    for (let i = 0; i < pagesNeeded; i++) {
      const apiPage = startPage + i;
      fetchPromises.push(
        fetch(`${API_BASE_URL}/tim-kiem?keyword=${encodedKeyword}&page=${apiPage}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`API responded with status: ${response.status}`);
            }
            return response.json() as Promise<MovieListResponse>;
          })
          .catch(err => {
            console.error(`Error fetching search page ${apiPage}:`, err);
            // Return an empty response for this page if it fails
            return { status: false, items: [] } as MovieListResponse;
          })
      );
    }
    
    // Wait for all fetch requests to complete
    const pagesData = await Promise.all(fetchPromises);
    
    // Combine the items from all pages
    const allItems = pagesData.flatMap(data => data.items || []);
    
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
    throw error;
  }
}

export async function fetchMoviesByCategory(categorySlug: string, page: number = 1, limit: number = 50): Promise<MovieListResponse> {
  try {
    // The external API returns ~10 items per page, but we want to show 50 items per page
    // So we need to fetch multiple pages of data for each of our "pages"
    const pagesNeeded = Math.ceil(limit / 10); // 10 is the number of items per page from external API
    const startPage = (page - 1) * pagesNeeded + 1;
    
    try {
      // Fetch multiple pages in parallel
      const fetchPromises = [];
      for (let i = 0; i < pagesNeeded; i++) {
        const apiPage = startPage + i;
        fetchPromises.push(
          fetch(`${API_BASE_URL}/the-loai/${categorySlug}?page=${apiPage}`)
            .then(response => {
              if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
              }
              return response.json() as Promise<MovieListResponse>;
            })
            .catch(err => {
              console.error(`Error fetching category page ${apiPage}:`, err);
              // Return an empty response for this page if it fails
              return { status: false, items: [] } as MovieListResponse;
            })
        );
      }
      
      // Wait for all fetch requests to complete
      const pagesData = await Promise.all(fetchPromises);
      
      // Combine the items from all pages
      const allItems = pagesData.flatMap(data => data.items || []);
      
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
    } catch (categoryError) {
      console.error(`Error fetching movies for category ${categorySlug}:`, categoryError);
      
      // Fallback to regular movie list and filter by category
      const allMoviesResponse = await fetchMovieList(page, limit);
      
      // Filter items that contain the category (simplified for demo)
      const filteredItems = allMoviesResponse.items.filter(item => {
        // This is a simplified approach - in a real app we'd need to check if the movie has this category
        return true; // Return all movies for now since we can't filter by category in this demo
      });
      
      // Create a new response with the filtered items
      const filteredResponse: MovieListResponse = {
        status: allMoviesResponse.status,
        items: filteredItems,
        pagination: {
          totalItems: filteredItems.length,
          totalPages: Math.ceil(filteredItems.length / limit),
          currentPage: page,
          totalItemsPerPage: limit
        }
      };
      
      return filteredResponse;
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
