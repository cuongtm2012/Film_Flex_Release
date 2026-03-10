import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { insertUserSchema, insertWatchlistSchema } from "@shared/schema";

const router = Router();

router.post("/users/register", async (req: Request, res: Response) => {
  try {
    const userSchema = insertUserSchema
      .extend({
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });

    const userData = userSchema.parse(req.body);
    req.body = userData;
    res.redirect(307, "/api/register");
  } catch (error) {
    res.status(400).json({ message: "Invalid user data" });
  }
});

router.get("/users/:userId/watchlist", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const watchlist = await storage.getWatchlist(userId);
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch watchlist" });
  }
});

router.post("/users/:userId/watchlist", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const watchlistData = insertWatchlistSchema.parse(req.body);

    await storage.addToWatchlist({
      ...watchlistData,
      userId,
    });

    try {
      const { watchlistNotificationService } = await import(
        "../services/watchlistNotificationService.js"
      );
      await watchlistNotificationService.initializeSnapshot(watchlistData.movieSlug);
    } catch (err) {
      console.error("Failed to initialize snapshot:", err);
    }

    res.status(201).json({ message: "Added to watchlist successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid watchlist data" });
  }
});

router.delete("/users/:userId/watchlist/:slug", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { slug } = req.params;
    await storage.removeFromWatchlist(userId, slug);
    res.json({ message: "Removed from watchlist successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove from watchlist" });
  }
});

router.get("/users/:userId/watchlist/check/:slug", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { slug } = req.params;
    const inWatchlist = await storage.checkWatchlist(userId, slug);
    res.json({ inWatchlist, movieSlug: slug, userId });
  } catch (error) {
    res.status(500).json({ message: "Failed to check watchlist status" });
  }
});

router.get("/users/:userId/view-history", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const viewHistory = await storage.getViewHistory(userId, limit);
    res.json(viewHistory);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch view history" });
  }
});

router.post("/users/:userId/view-history", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { movieSlug, progress } = req.body;

    if (!movieSlug) {
      return res.status(400).json({ message: "Movie slug is required" });
    }

    const movie = await storage.getMovieBySlug(movieSlug);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    await storage.addToViewHistory(userId, movieSlug, progress || 0);
    res.status(201).json({ message: "View history added successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid view history data" });
  }
});

router.put("/users/:userId/view-history/:slug/progress", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { slug } = req.params;
    const { progress } = req.body;

    if (progress === undefined) {
      return res.status(400).json({ message: "Progress is required" });
    }

    await storage.updateViewProgress(userId, slug, progress);
    res.json({ message: "View progress updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update view progress" });
  }
});

router.get("/users/:userId/view-history/:slug", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { slug } = req.params;
    const viewHistory = await storage.getViewedMovie(userId, slug);
    if (viewHistory) {
      res.json(viewHistory);
    } else {
      res.status(404).json({ message: "Movie not found in view history" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to get view history" });
  }
});

router.delete("/users/:userId/view-history/:slug", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { slug } = req.params;
    await storage.removeFromViewHistory(userId, slug);
    res.json({ message: "Removed from view history successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove from view history" });
  }
});

router.delete("/users/:userId/view-history", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    await storage.clearViewHistory(userId);
    res.json({ message: "View history cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear view history" });
  }
});

export default router;
