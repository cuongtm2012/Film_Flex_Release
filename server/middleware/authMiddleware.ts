import { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if a user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: "Not authenticated" });
}

/**
 * Middleware to check if a user has admin role
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  
  res.status(403).json({ message: "Access denied: Admin role required" });
}

/**
 * Middleware to check if a user has admin or moderator role
 */
export function isAdminOrModerator(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user.role === "admin" || req.user.role === "moderator")) {
    return next();
  }
  
  res.status(403).json({ message: "Access denied: Admin or moderator role required" });
}

/**
 * Middleware to check if a user account is active
 */
export function isActive(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.status === "active") {
    return next();
  }
  
  res.status(403).json({ message: "Account is not active" });
}