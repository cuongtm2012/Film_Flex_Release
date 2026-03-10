import { Router, type Request, type Response } from "express";
import { StreamingUtils } from "../utils/streaming-utils.js";

const router = Router();

router.get("/stream/proxy", async (req: Request, res: Response) => {
  try {
    const { url, quality } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({
        status: false,
        message: "URL parameter is required",
      });
    }
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        status: false,
        message: "Invalid URL format",
      });
    }
    const result = await StreamingUtils.optimizeStream(url, quality as string);
    if (!result.success) {
      return res.status(400).json({
        status: false,
        message: result.error,
      });
    }
    res.json({
      status: true,
      data: {
        originalUrl: url,
        optimizedUrl: result.optimizedUrl,
        success: result.success,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
});

router.get("/stream/health", async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({
        status: false,
        message: "URL parameter is required",
      });
    }
    const health = await StreamingUtils.checkStreamHealth(url);
    res.json({
      status: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to check stream health",
    });
  }
});

export default router;
