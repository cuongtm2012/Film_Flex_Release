import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertCommentSchema, insertUserSchema, insertWatchlistSchema } from "@shared/schema";
import { 
  fetchMovieList, 
  fetchMovieDetail, 
  searchMovies, 
  fetchMoviesByCategory,
  fetchMoviesByCountry,
  convertToMovieModel,
  convertToEpisodeModels
} from "./api";

const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function registerRoutes(app: Express): Promise<Server> {
  // Get paginated movie list
  app.get("/api/movies", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      
      // Try to get from cache first
      let movieListData = await storage.getMovieListCache(page);
      
      // If not in cache or cache is expired, fetch from API
      if (!movieListData) {
        movieListData = await fetchMovieList(page);
        
        // Cache the result
        await storage.cacheMovieList(movieListData, page);
        
        // Save movies to storage
        for (const item of movieListData.items) {
          const existingMovie = await storage.getMovieBySlug(item.slug);
          
          if (!existingMovie) {
            await storage.saveMovie({
              movieId: item._id,
              slug: item.slug,
              name: item.name,
              originName: item.origin_name,
              posterUrl: item.poster_url,
              thumbUrl: item.thumb_url,
              year: item.year,
              type: item.tmdb?.type || "movie",
              quality: "",
              lang: "",
              time: "",
              view: 0,
              description: "",
              status: "",
              trailerUrl: "",
              categories: [],
              countries: [],
              actors: "",
              directors: ""
            });
          }
        }
      }
      
      res.json(movieListData);
    } catch (error) {
      console.error("Error fetching movies:", error);
      res.status(500).json({ message: "Failed to fetch movies" });
    }
  });
  
  // Get movie detail by slug
  app.get("/api/movies/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      // Try to get from cache first
      let movieDetailData = await storage.getMovieDetailCache(slug);
      
      // If not in cache or cache is expired, fetch from API
      if (!movieDetailData) {
        movieDetailData = await fetchMovieDetail(slug);
        
        // Cache the result
        await storage.cacheMovieDetail(movieDetailData);
        
        // Save movie and episodes to storage
        const movieModel = convertToMovieModel(movieDetailData);
        const episodeModels = convertToEpisodeModels(movieDetailData);
        
        await storage.saveMovie(movieModel);
        
        for (const episode of episodeModels) {
          await storage.saveEpisode(episode);
        }
      }
      
      res.json(movieDetailData);
    } catch (error) {
      console.error(`Error fetching movie detail for slug ${req.params.slug}:`, error);
      res.status(500).json({ message: "Failed to fetch movie detail" });
    }
  });
  
  // Search movies
  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const keyword = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      
      if (!keyword || keyword.trim() === "") {
        return res.status(400).json({ message: "Search keyword is required" });
      }
      
      const searchResults = await searchMovies(keyword, page);
      res.json(searchResults);
    } catch (error) {
      console.error("Error searching movies:", error);
      res.status(500).json({ message: "Failed to search movies" });
    }
  });
  
  // Get movies by category
  app.get("/api/categories/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      
      const categoryMovies = await fetchMoviesByCategory(slug, page);
      res.json(categoryMovies);
    } catch (error) {
      console.error(`Error fetching movies for category ${req.params.slug}:`, error);
      res.status(500).json({ message: "Failed to fetch category movies" });
    }
  });
  
  // Get movies by country
  app.get("/api/countries/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      
      const countryMovies = await fetchMoviesByCountry(slug, page);
      res.json(countryMovies);
    } catch (error) {
      console.error(`Error fetching movies for country ${req.params.slug}:`, error);
      res.status(500).json({ message: "Failed to fetch country movies" });
    }
  });
  
  // Get episodes for a movie
  app.get("/api/movies/:slug/episodes", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      // Try to get from cache first
      let movieDetailData = await storage.getMovieDetailCache(slug);
      
      // If not in cache, fetch from API
      if (!movieDetailData) {
        movieDetailData = await fetchMovieDetail(slug);
        await storage.cacheMovieDetail(movieDetailData);
      }
      
      res.json({ episodes: movieDetailData.episodes });
    } catch (error) {
      console.error(`Error fetching episodes for movie ${req.params.slug}:`, error);
      res.status(500).json({ message: "Failed to fetch episodes" });
    }
  });
  
  // User registration
  app.post("/api/users/register", async (req: Request, res: Response) => {
    try {
      const userSchema = insertUserSchema.extend({
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });
      
      const userData = userSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create new user (omitting confirmPassword)
      const { confirmPassword, ...userToInsert } = userData;
      const newUser = await storage.createUser(userToInsert);
      
      // Omit password from response
      const { password, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });
  
  // Comment operations
  app.get("/api/movies/:slug/comments", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const comments = await storage.getCommentsByMovieSlug(slug, page, limit);
      res.json(comments);
    } catch (error) {
      console.error(`Error fetching comments for movie ${req.params.slug}:`, error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  
  app.post("/api/movies/:slug/comments", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const commentData = insertCommentSchema.parse(req.body);
      
      const comment = await storage.addComment({
        ...commentData,
        movieSlug: slug
      });
      
      res.status(201).json(comment);
    } catch (error) {
      console.error(`Error adding comment to movie ${req.params.slug}:`, error);
      res.status(400).json({ message: "Invalid comment data" });
    }
  });
  
  app.post("/api/comments/:id/like", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.likeComment(id);
      res.json({ message: "Comment liked successfully" });
    } catch (error) {
      console.error(`Error liking comment ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to like comment" });
    }
  });
  
  app.post("/api/comments/:id/dislike", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.dislikeComment(id);
      res.json({ message: "Comment disliked successfully" });
    } catch (error) {
      console.error(`Error disliking comment ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to dislike comment" });
    }
  });
  
  // Watchlist operations
  app.get("/api/users/:userId/watchlist", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const watchlist = await storage.getWatchlist(userId);
      res.json(watchlist);
    } catch (error) {
      console.error(`Error fetching watchlist for user ${req.params.userId}:`, error);
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });
  
  app.post("/api/users/:userId/watchlist", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const watchlistData = insertWatchlistSchema.parse(req.body);
      
      await storage.addToWatchlist({
        ...watchlistData,
        userId
      });
      
      res.status(201).json({ message: "Added to watchlist successfully" });
    } catch (error) {
      console.error(`Error adding to watchlist for user ${req.params.userId}:`, error);
      res.status(400).json({ message: "Invalid watchlist data" });
    }
  });
  
  app.delete("/api/users/:userId/watchlist/:slug", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { slug } = req.params;
      
      await storage.removeFromWatchlist(userId, slug);
      res.json({ message: "Removed from watchlist successfully" });
    } catch (error) {
      console.error(`Error removing from watchlist for user ${req.params.userId}:`, error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
