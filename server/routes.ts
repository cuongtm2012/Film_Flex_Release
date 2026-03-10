import type { Express } from 'express';
import express from "express";

import adminRoutes from './routes/admin/index.js';
import seoRoutes from './routes/seo.js';
import notificationRoutes from './routes/notification-routes.js';
import userPreferencesRoutes from './routes/user-preferences.js';
import aiRoutes from './routes/ai-routes.js';

// Modular routers
import healthRouter from './routes/health.js';
import elasticsearchRouter from './routes/elasticsearch.js';
import streamRouter from './routes/stream.js';
import searchRouter from './routes/search.js';
import moviesRouter from './routes/movies.js';
import userRouter from './routes/user.js';

export function registerRoutes(app: Express): void {
  const router = express.Router();

  // Mount all the routes here
  app.use('/api', router);

  // Register admin routes
  app.use('/api/admin', adminRoutes);

  // Register SEO routes
  app.use('/api', seoRoutes);

  // Register notification routes
  app.use('/api/notifications', notificationRoutes);

  // Register user preferences routes
  app.use('/api/user', userPreferencesRoutes);

  // Register AI routes
  app.use('/api/ai', aiRoutes);

  // Mount split routers (health, elasticsearch, stream, search)
  router.use(healthRouter);
  router.use(elasticsearchRouter);
  router.use(streamRouter);
  router.use(searchRouter);
  router.use(moviesRouter);
  router.use(userRouter);
}
