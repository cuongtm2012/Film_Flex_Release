import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, UserRole, UserStatus, ActivityType } from "@shared/schema";
import { log } from "./vite";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized - Please log in" });
}

// Middleware to check if user has admin role
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === UserRole.ADMIN) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin access required" });
}

// Middleware to check if user is admin or moderator
export function isAdminOrModerator(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && 
      (req.user.role === UserRole.ADMIN || req.user.role === UserRole.MODERATOR)) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin or Moderator access required" });
}

// Middleware to check if user account is active
export function isActive(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.status === UserStatus.ACTIVE) {
    return next();
  }
  res.status(403).json({ message: "Account is inactive or suspended" });
}

// Log user activity
async function logUserActivity(userId: number, activityType: string, targetId?: number, details?: any, ipAddress?: string) {
  try {
    await storage.addAuditLog({
      userId,
      activityType,
      targetId: targetId || null,
      details: details || null,
      ipAddress: ipAddress || null
    });
  } catch (error) {
    log(`Error logging user activity: ${error}`, "auth");
  }
}

export function setupAuth(app: Express) {
  // Set up session middleware
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "filmflex-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport to use local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        if (user.status !== UserStatus.ACTIVE) {
          return done(null, false, { message: "Account is inactive or suspended" });
        }
        
        if (!(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        // Update last login time
        await storage.updateUser(user.id, { lastLogin: new Date() });
        
        // Log login activity
        await logUserActivity(user.id, ActivityType.USER_LOGIN);
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Log activity
      await logUserActivity(user.id, ActivityType.USER_CREATED, user.id);

      // Log the user in automatically
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message || "Authentication failed" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      
      req.logout((err) => {
        if (err) return next(err);
        
        // Log logout activity
        logUserActivity(userId, ActivityType.USER_LOGOUT)
          .then(() => res.sendStatus(200))
          .catch(next);
      });
    } else {
      res.sendStatus(200);
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // User management routes (Admin only)
  app.get("/api/admin/users", isAdmin, isActive, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const filters = {
        role: req.query.role as string,
        status: req.query.status as string,
        search: req.query.search as string
      };
      
      const { data, total } = await storage.getAllUsers(page, limit, filters);
      
      // Remove passwords from response
      const usersWithoutPasswords = data.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json({
        data: usersWithoutPasswords,
        pagination: {
          total,
          page,
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/users/:id", isAdmin, isActive, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow password updates through this endpoint
      const { password, ...updateData } = req.body;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log activity
      await logUserActivity(
        req.user.id,
        ActivityType.USER_UPDATED,
        userId,
        { updatedFields: Object.keys(updateData) }
      );
      
      // Remove password from response
      const { password: userPassword, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/admin/users/:id/status", isAdmin, isActive, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !Object.values(UserStatus).includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedUser = await storage.changeUserStatus(userId, status);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log activity
      await logUserActivity(
        req.user.id,
        ActivityType.USER_STATUS_CHANGED,
        userId,
        { previousStatus: updatedUser.status, newStatus: status }
      );
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Content approval routes
  app.get("/api/moderator/content/pending", isAdminOrModerator, isActive, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const { data, total } = await storage.getPendingContent(page, limit);
      
      res.json({
        data,
        pagination: {
          total,
          page,
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/moderator/content/user", isAuthenticated, isActive, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      
      const { data, total } = await storage.getContentByUser(req.user.id, page, limit, status);
      
      res.json({
        data,
        pagination: {
          total,
          page,
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/moderator/content/submit", isAdminOrModerator, isActive, async (req, res, next) => {
    try {
      const contentApproval = await storage.submitContentForApproval({
        movieId: req.body.movieId,
        submittedByUserId: req.user.id,
        status: '',
        comments: req.body.comments || null
      });
      
      // Log activity
      await logUserActivity(
        req.user.id,
        ActivityType.CONTENT_SUBMITTED,
        contentApproval.id,
        { movieId: req.body.movieId }
      );
      
      res.status(201).json(contentApproval);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/content/:id/approve", isAdmin, isActive, async (req, res, next) => {
    try {
      const contentId = parseInt(req.params.id);
      const { comments } = req.body;
      
      const contentApproval = await storage.approveContent(contentId, req.user.id, comments);
      
      if (!contentApproval) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      // Log activity
      await logUserActivity(
        req.user.id,
        ActivityType.CONTENT_APPROVED,
        contentId,
        { movieId: contentApproval.movieId }
      );
      
      res.json(contentApproval);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/content/:id/reject", isAdmin, isActive, async (req, res, next) => {
    try {
      const contentId = parseInt(req.params.id);
      const { comments } = req.body;
      
      if (!comments) {
        return res.status(400).json({ message: "Rejection comments are required" });
      }
      
      const contentApproval = await storage.rejectContent(contentId, req.user.id, comments);
      
      if (!contentApproval) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      // Log activity
      await logUserActivity(
        req.user.id,
        ActivityType.CONTENT_REJECTED,
        contentId,
        { movieId: contentApproval.movieId, comments }
      );
      
      res.json(contentApproval);
    } catch (error) {
      next(error);
    }
  });

  // Audit log routes (Admin only)
  app.get("/api/admin/logs", isAdmin, isActive, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const filters = {
        activityType: req.query.activityType as string,
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined
      };
      
      const { data, total } = await storage.getAuditLogs(page, limit, filters);
      
      res.json({
        data,
        pagination: {
          total,
          page,
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  });
}