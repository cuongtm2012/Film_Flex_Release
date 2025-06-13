import { Router } from 'express';
import featuredSectionsRouter from './featured-sections.js';
import moviesRouter from './movies.js';

const router = Router();

// Register all admin routes
router.use('/featured-sections', featuredSectionsRouter);
router.use('/movies', moviesRouter);

export default router; 