import { Router } from 'express';
import featuredSectionsRouter from './featured-sections';
import moviesRouter from './movies';

const router = Router();

// Register all admin routes
router.use('/featured-sections', featuredSectionsRouter);
router.use('/movies', moviesRouter);

export default router; 