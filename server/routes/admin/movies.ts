import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage.js';
import { isAdmin } from '../../middleware/auth.js';
import { Section } from '@shared/schema';

const router = Router();

// Get movies by section
router.get('/sections/:section', isAdmin, async (req, res) => {  try {
    const { section } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 48;

    if (!Object.values(Section).includes(section as any)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const result = await storage.getMoviesBySection(section as string, page, limit);
    res.json({
      status: true,
      items: result.data,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        totalItemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching movies by section:', error);
    res.status(500).json({ error: 'Failed to fetch movies by section' });
  }
});

// Update movie section
router.put('/:movieId/section', isAdmin, async (req, res) => {
  try {
    const { movieId } = req.params;    const schema = z.object({
      section: z.enum(Object.values(Section) as [string, ...string[]])
    });
    const { section } = schema.parse(req.body);
    await storage.updateMovieSection(movieId, section as string);
    res.json({ status: true, message: 'Movie section updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid section data' });
    }
    console.error('Error updating movie sections:', error);
    res.status(500).json({ error: 'Failed to update movie sections' });
  }
});

export default router; 