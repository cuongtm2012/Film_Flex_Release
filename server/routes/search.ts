import { Router, type Request, type Response } from "express";
import { normalizeText } from "@shared/schema";
import { searchMovies } from "./helpers.js";

const router = Router();

router.get("/search/suggestions", async (req: Request, res: Response) => {
  try {
    const keyword = (req.query.q as string)?.trim() ?? "";
    if (!keyword) {
      return res.json({ items: [], status: true });
    }
    const normalizedKeyword = normalizeText(keyword.toLowerCase());
    const searchResults = await searchMovies(keyword.toLowerCase(), normalizedKeyword, 1, 8);
    return res.json({
      items: (searchResults.items ?? []).slice(0, 8),
      status: true,
    });
  } catch (error) {
    return res.json({ items: [], status: true });
  }
});

router.get("/search", async (req: Request, res: Response) => {
  try {
    const keyword = ((req.query.q as string) || "").trim();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 48;
    const section = req.query.section as string;
    const isRecommendedParam = req.query.isRecommended as string;
    const type = req.query.type as string;

    let isRecommended: boolean | undefined;
    if (isRecommendedParam !== undefined && isRecommendedParam !== "") {
      isRecommended = isRecommendedParam === "true";
    }
    const filters: { isRecommended?: boolean; type?: string; section?: string } = {};
    if (isRecommended !== undefined) filters.isRecommended = isRecommended;
    if (type) filters.type = type;
    if (section) filters.section = section;

    if (section && !keyword) {
      return res.redirect(`/api/movies/sections/${section}?page=${page}&limit=${limit}`);
    }

    if (!keyword) {
      return res.json({
        status: true,
        items: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
          totalItemsPerPage: limit,
        },
      });
    }

    const lowercaseKeyword = keyword.toLowerCase();
    const normalizedKeyword = normalizeText(lowercaseKeyword);
    const searchResults = await searchMovies(
      lowercaseKeyword,
      normalizedKeyword,
      page,
      limit,
      undefined,
      filters
    );

    if (!searchResults.pagination) {
      const totalItems = searchResults.items?.length || 0;
      searchResults.pagination = {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        totalItemsPerPage: limit,
      };
    }

    res.json(searchResults);
  } catch (error) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 48;
    res.json({
      status: true,
      items: [],
      pagination: {
        totalItems: 0,
        totalPages: 0,
        currentPage: page,
        totalItemsPerPage: limit,
      },
    });
  }
});

export default router;
