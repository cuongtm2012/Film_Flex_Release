import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/schema';

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in to continue' });
  }
  next();
};

// Middleware to check if user is an admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in to continue' });
  }
  
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Access denied - Administrator privileges required' });
  }
  
  next();
};

// Middleware to check if user is a moderator or admin
export const isModerator = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in to continue' });
  }
  
  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.MODERATOR) {
    return res.status(403).json({ error: 'Access denied - Moderator privileges required' });
  }
  
  next();
};