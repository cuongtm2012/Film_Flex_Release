import { Router, type Request, type Response } from "express";
import { storage } from "../storage.js";

const router = Router();

router.post("/elasticsearch/sync/full", async (_req: Request, res: Response) => {
  try {
    if (!storage.isElasticsearchEnabled()) {
      return res.status(503).json({
        status: false,
        message: "Elasticsearch is not available",
      });
    }
    const dataSyncService = storage.dataSync;
    if (!dataSyncService) {
      return res.status(503).json({
        status: false,
        message: "Data sync service is not available",
      });
    }
    console.log("Starting manual full sync...");
    const result = await dataSyncService.fullSync();
    res.json({
      status: true,
      message: "Full sync completed successfully",
      result: {
        movies: result.movies,
        episodes: result.episodes,
        errors: result.errors.length,
        errorDetails: result.errors,
      },
    });
  } catch (error) {
    console.error("Manual full sync failed:", error);
    res.status(500).json({
      status: false,
      message: "Full sync failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/elasticsearch/sync/incremental", async (_req: Request, res: Response) => {
  try {
    if (!storage.isElasticsearchEnabled()) {
      return res.status(503).json({
        status: false,
        message: "Elasticsearch is not available",
      });
    }
    const dataSyncService = storage.dataSync;
    if (!dataSyncService) {
      return res.status(503).json({
        status: false,
        message: "Data sync service is not available",
      });
    }
    console.log("Starting manual incremental sync...");
    const result = await dataSyncService.incrementalSync();
    res.json({
      status: true,
      message: "Incremental sync completed successfully",
      result: {
        movies: result.movies,
        episodes: result.episodes,
        errors: result.errors.length,
        errorDetails: result.errors,
      },
    });
  } catch (error) {
    console.error("Manual incremental sync failed:", error);
    res.status(500).json({
      status: false,
      message: "Incremental sync failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/elasticsearch/status", async (_req: Request, res: Response) => {
  try {
    const isEnabled = storage.isElasticsearchEnabled();
    if (!isEnabled) {
      return res.json({
        status: true,
        elasticsearch: {
          enabled: false,
          message: "Elasticsearch is not available",
        },
      });
    }
    const dataSyncService = storage.dataSync;
    if (!dataSyncService) {
      return res.json({
        status: true,
        elasticsearch: {
          enabled: true,
          syncService: false,
          message: "Data sync service is not available",
        },
      });
    }
    const syncStatus = await dataSyncService.getSyncStatus();
    const validation = await dataSyncService.validateSync();
    res.json({
      status: true,
      elasticsearch: {
        enabled: true,
        syncService: true,
        lastSync: syncStatus.lastSyncTime,
        isFullSyncRunning: syncStatus.isFullSyncRunning,
        health: syncStatus.elasticsearchHealth,
        validation: {
          dbMovies: validation.dbMovieCount,
          esMovies: validation.esMovieCount,
          dbEpisodes: validation.dbEpisodeCount,
          esEpisodes: validation.esEpisodeCount,
          isInSync: validation.isInSync,
        },
      },
    });
  } catch (error) {
    console.error("Failed to get Elasticsearch status:", error);
    res.status(500).json({
      status: false,
      message: "Failed to get Elasticsearch status",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
