import { Router } from 'express';
import featuredSectionsRouter from './featured-sections.js';
import moviesRouter from './movies.js';
import settingsRouter from './settings.js';

const router = Router();

// Register all admin routes
router.use('/featured-sections', featuredSectionsRouter);
router.use('/movies', moviesRouter);
router.use('/settings', settingsRouter);

export default router; 