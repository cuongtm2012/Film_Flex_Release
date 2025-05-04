import { Request, Response } from "express";
import { storage } from "../storage";
import * as authService from "../services/authService";
import { insertUserSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

/**
 * Register a new user
 */
export async function registerUser(req: Request, res: Response) {
  try {
    // Validate input
    const validationResult = insertUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errorMessage = fromZodError(validationResult.error).message;
      return res.status(400).json({ message: errorMessage });
    }
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }
    
    // Hash password and create user
    const hashedPassword = await authService.hashPassword(req.body.password);
    const user = await storage.createUser({
      ...req.body,
      password: hashedPassword,
    });
    
    // Log into the newly created account
    req.login(user, (err) => {
      if (err) {
        console.error("Error during login after registration:", err);
        return res.status(500).json({ message: "Registration successful, but login failed" });
      }
      res.status(201).json(user);
    });
  } catch (error) {
    console.error("Error in registerUser controller:", error);
    res.status(500).json({
      message: "Failed to register user",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get the current user's profile
 */
export function getCurrentUser(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  res.json(req.user);
}

/**
 * Get a user's watchlist
 */
export async function getUserWatchlist(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    
    // Check if the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if the requesting user has permission
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Get the watchlist
    const watchlist = await storage.getWatchlistByUserId(userId);
    res.json({ watchlist });
  } catch (error) {
    console.error(`Error in getUserWatchlist controller for user ${req.params.userId}:`, error);
    res.status(500).json({
      message: "Failed to fetch user watchlist",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Add a movie to a user's watchlist
 */
export async function addToWatchlist(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const { movieSlug } = req.body;
    
    if (!movieSlug) {
      return res.status(400).json({ message: "Movie slug is required" });
    }
    
    // Check if the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if the requesting user has permission
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Check if the movie exists
    const movie = await storage.getMovieBySlug(movieSlug);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }
    
    // Check if the movie is already in the watchlist
    const existingEntry = await storage.getWatchlistEntry(userId, movieSlug);
    if (existingEntry) {
      return res.status(200).json({ message: "Movie already in watchlist" });
    }
    
    // Add the movie to the watchlist
    await storage.addToWatchlist(userId, movieSlug);
    
    // Log the activity
    await authService.logUserActivity(userId, "WATCHLIST_ADD", undefined, { movieSlug });
    
    res.status(201).json({ message: "Added to watchlist" });
  } catch (error) {
    console.error(`Error in addToWatchlist controller for user ${req.params.userId}:`, error);
    res.status(500).json({
      message: "Failed to add to watchlist",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Remove a movie from a user's watchlist
 */
export async function removeFromWatchlist(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const { slug } = req.params;
    
    // Check if the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if the requesting user has permission
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Remove the movie from the watchlist
    await storage.removeFromWatchlist(userId, slug);
    
    // Log the activity
    await authService.logUserActivity(userId, "WATCHLIST_REMOVE", undefined, { movieSlug: slug });
    
    res.json({ message: "Removed from watchlist" });
  } catch (error) {
    console.error(`Error in removeFromWatchlist controller for user ${req.params.userId}:`, error);
    res.status(500).json({
      message: "Failed to remove from watchlist",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}