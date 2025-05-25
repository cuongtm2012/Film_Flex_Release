import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { isAdmin } from '../../middleware/auth';

const router = Router();

// Get all featured sections
router.get('/', isAdmin, async (req, res) => {
  try {
    const sections = await storage.getFeaturedSections();
    res.json(sections);
  } catch (error) {
    console.error('Error fetching featured sections:', error);
    res.status(500).json({ error: 'Failed to fetch featured sections' });
  }
});

// Get movies in a specific section
router.get('/:sectionName/movies', isAdmin, async (req, res) => {
  try {
    const { sectionName } = req.params;
    const movies = await storage.getFeaturedSectionMovies(sectionName);
    res.json(movies);
  } catch (error) {
    console.error('Error fetching section movies:', error);
    res.status(500).json({ error: 'Failed to fetch section movies' });
  }
});

// Update a section's movies and order
const updateSectionSchema = z.object({
  filmIds: z.array(z.number()),
  displayOrder: z.array(z.number())
});

router.post('/:sectionName', isAdmin, async (req, res) => {
  try {
    const { sectionName } = req.params;
    const { filmIds, displayOrder } = updateSectionSchema.parse(req.body);

    // Validate that displayOrder contains all filmIds
    if (filmIds.length !== displayOrder.length || 
        !filmIds.every(id => displayOrder.includes(id))) {
      return res.status(400).json({ 
        error: 'displayOrder must contain all filmIds in the desired order' 
      });
    }

    await storage.updateFeaturedSection(sectionName, filmIds, displayOrder);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error updating featured section:', error);
    res.status(500).json({ error: 'Failed to update featured section' });
  }
});

export default router; 