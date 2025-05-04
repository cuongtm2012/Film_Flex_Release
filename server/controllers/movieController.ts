import { Request, Response } from "express";
import * as movieService from "../services/movieService";
import { storage } from "../storage";
import { insertMovieSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

/**
 * Get a list of movies with pagination
 */
export async function getMovies(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const movies = await movieService.fetchMovieList(page, limit);
    res.json(movies);
  } catch (error) {
    console.error("Error in getMovies controller:", error);
    res.status(500).json({
      message: "Failed to fetch movie list",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get details for a specific movie by slug
 */
export async function getMovieBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    
    // Try to get from local database first
    const localMovie = await storage.getMovieBySlug(slug);
    
    if (localMovie) {
      const episodes = await storage.getEpisodesByMovieSlug(slug);
      
      return res.json({
        status: true,
        msg: "",
        movie: localMovie,
        episodes: episodes
      });
    }
    
    // If not in local DB, fetch from external API
    const movieDetail = await movieService.fetchMovieDetail(slug);
    
    if (!movieDetail.status || !movieDetail.movie) {
      return res.status(404).json({
        status: false,
        msg: "Movie not found",
        movie: null,
        episodes: []
      });
    }
    
    // Save movie and episodes to database
    try {
      const movieModel = movieService.convertToMovieModel(movieDetail);
      await storage.saveMovie(movieModel);
      
      const episodeModels = movieService.convertToEpisodeModels(movieDetail);
      await storage.saveEpisodes(episodeModels);
    } catch (error) {
      console.error(`Error saving movie ${slug} to database:`, error);
      // Continue to return the movie detail from API even if saving fails
    }
    
    res.json(movieDetail);
  } catch (error) {
    console.error(`Error in getMovieBySlug controller for slug ${req.params.slug}:`, error);
    res.status(500).json({
      message: "Failed to fetch movie details",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Search for movies by keyword
 */
export async function searchMovies(req: Request, res: Response) {
  try {
    const keyword = req.query.keyword as string;
    
    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Search keyword is required",
        items: []
      });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const results = await movieService.searchMovies(keyword, page, limit);
    res.json(results);
  } catch (error) {
    console.error("Error in searchMovies controller:", error);
    res.status(500).json({
      message: "Failed to search movies",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get search suggestions
 */
export async function getSearchSuggestions(req: Request, res: Response) {
  try {
    const keyword = req.query.keyword as string;
    
    if (!keyword || keyword.trim().length === 0) {
      return res.json({ items: [] });
    }
    
    // Get suggestions (limit to 10)
    const results = await movieService.searchMovies(keyword, 1, 10);
    
    // Format the response
    res.json({
      items: results.items.map(movie => ({
        slug: movie.slug,
        name: movie.name,
        thumb_url: movie.thumb_url
      }))
    });
  } catch (error) {
    console.error("Error in getSearchSuggestions controller:", error);
    res.status(500).json({
      message: "Failed to get search suggestions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get movies by category
 */
export async function getMoviesByCategory(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Fetch movies by category from external API
    const categoryResponse = await movieService.fetchMoviesByCategory(slug, page, limit);
    res.json(categoryResponse);
  } catch (error) {
    console.error(`Error in getMoviesByCategory controller for category ${req.params.slug}:`, error);
    res.status(500).json({
      message: "Failed to fetch movies by category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get movies by country
 */
export async function getMoviesByCountry(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    
    // Fetch movies by country from external API
    const countryResponse = await movieService.fetchMoviesByCountry(slug, page);
    res.json(countryResponse);
  } catch (error) {
    console.error(`Error in getMoviesByCountry controller for country ${req.params.slug}:`, error);
    res.status(500).json({
      message: "Failed to fetch movies by country",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get episodes for a movie
 */
export async function getMovieEpisodes(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    
    // Get episodes from database
    const episodes = await storage.getEpisodesByMovieSlug(slug);
    
    if (!episodes || episodes.length === 0) {
      // If not in database, fetch from API
      const movieDetail = await movieService.fetchMovieDetail(slug);
      
      if (!movieDetail.status || !movieDetail.movie) {
        return res.status(404).json({
          status: false,
          msg: "Movie not found",
          episodes: []
        });
      }
      
      // Save episodes to database
      try {
        const episodeModels = movieService.convertToEpisodeModels(movieDetail);
        await storage.saveEpisodes(episodeModels);
      } catch (error) {
        console.error(`Error saving episodes for movie ${slug} to database:`, error);
      }
      
      return res.json({
        status: true,
        msg: "",
        episodes: movieDetail.episodes
      });
    }
    
    // Group episodes by server
    const groupedEpisodes: any[] = [];
    const serverMap = new Map<string, number>();
    
    episodes.forEach(episode => {
      let serverIndex = serverMap.get(episode.server_name);
      
      if (serverIndex === undefined) {
        serverIndex = groupedEpisodes.length;
        serverMap.set(episode.server_name, serverIndex);
        
        groupedEpisodes.push({
          server_name: episode.server_name,
          server_data: []
        });
      }
      
      groupedEpisodes[serverIndex].server_data.push({
        name: episode.name,
        slug: episode.slug,
        filename: episode.filename,
        link_embed: episode.link_embed,
        link_m3u8: episode.link_m3u8
      });
    });
    
    res.json({
      status: true,
      msg: "",
      episodes: groupedEpisodes
    });
  } catch (error) {
    console.error(`Error in getMovieEpisodes controller for movie ${req.params.slug}:`, error);
    res.status(500).json({
      message: "Failed to fetch movie episodes",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get recommended movies for a specific movie
 */
export async function getRecommendedMovies(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const recommendations = await movieService.fetchRecommendedMovies(slug, limit);
    res.json(recommendations);
  } catch (error) {
    console.error(`Error in getRecommendedMovies controller for movie ${req.params.slug}:`, error);
    res.status(500).json({
      message: "Failed to fetch movie recommendations",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}