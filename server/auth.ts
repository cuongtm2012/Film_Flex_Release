import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction, RequestHandler } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

// Extend Express types for better type safety
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
      status: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Log user activity with explicit types
async function logUserActivity(
  userId: number, 
  activityType: string, 
  targetId?: number | null, 
  details?: Record<string, any> | null, 
  ipAddress?: string | null
): Promise<void> {
  try {
    await storage.addAuditLog({
      userId,
      activityType,
      targetId,
      details,
      ipAddress,
      // Remove the invalid createdAt property
      // The storage.addAuditLog function will handle timestamp automatically
    });
  } catch (error) {
    console.error("Failed to log user activity:", error);
  }
}

// Middleware for checking if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Middleware for checking if user is admin
export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Unauthorized - Admin access required" });
};

// Middleware for checking if user is admin or moderator
export const isAdminOrModerator: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user?.role === "admin" || req.user?.role === "moderator")) {
    return next();
  }
  res.status(403).json({ message: "Unauthorized - Moderator or Admin access required" });
};

// Middleware for checking if user is active
export const isActive: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user?.status === "active") {
    return next();
  }
  res.status(403).json({ message: "Account is not active" });
};

export function setupAuth(app: Express): void {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "filmflex-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    store: storage.sessionStore,
    name: 'filmflex.sid',
    rolling: true, // Refresh session with each request
  };

  // Trust first proxy in production
  if (process.env.NODE_ENV === 'production') {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username: string, password: string, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const passwordsMatch = await comparePasswords(password, user.password);
        if (!passwordsMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Log the activity
        await logUserActivity(user.id, "login", null, null, null);

        // Omit password before passing to done
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, (user as Express.User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      // Omit password from session
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      // Check if user exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);

      // Remove confirmPassword if it exists
      const { confirmPassword, ...userData } = req.body;

      // Create user with default role
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: req.body.role || "normal",
        status: req.body.status || "active",
      });

      // Log the registration
      await logUserActivity(user.id, "register", null, null, req.ip);

      // Log the user in
      req.login(user, (err: Error | null) => {
        if (err) {
          return res.status(500).json({ message: "Login after registration failed" });
        }
        
        // Omit password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: LocalStrategyInfo | undefined) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", isAuthenticated, (req: Request, res: Response) => {
    if (req.user) {
      const userId = (req.user as Express.User).id;
      // Log the activity before logging out
      logUserActivity(userId, "logout", null, null, req.ip);
    }
    
    req.logout(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  app.put("/api/user/profile", isAuthenticated, isActive, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      const allowedUpdates = ["email", "displayName", "avatar"];
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj: Record<string, any>, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the activity
      await logUserActivity(userId, "profile_update", userId, updates, req.ip);

      // Omit password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/user/password", isAuthenticated, isActive, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Get user with password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const passwordsMatch = await comparePasswords(currentPassword, user.password);
      if (!passwordsMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });

      // Log the activity
      await logUserActivity(userId, "password_change", userId, null, req.ip);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        role: req.query.role as string,
        status: req.query.status as string,
        search: req.query.search as string
      };

      const users = await storage.getAllUsers(page, limit, filters);
      
      // Log the activity
      await logUserActivity(userId, "view_users", undefined, { page, limit, filters }, req.ip);
      
      res.json(users);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = (req.user as Express.User).id;
      const { username, email, role, password = "12345678" } = req.body;

      // Validate required fields
      if (!username || !email || !role) {
        return res.status(400).json({ message: "Username, email, and role are required" });
      }

      // Validate role
      if (!["user", "mod", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be user, mod, or admin" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash the password (default or provided)
      const hashedPassword = await hashPassword(password);

      // Map frontend role to backend role format
      let mappedRole = role;
      if (role === "mod") {
        mappedRole = "moderator";
      } else if (role === "user") {
        mappedRole = "normal";
      }

      // Create the user
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: mappedRole,
        status: "active",
      });

      // Log the activity
      await logUserActivity(
        adminId,
        "create_user",
        newUser.id,
        { newUserRole: mappedRole, createdBy: "admin" },
        req.ip
      );

      // Omit password from response
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Admin create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/admin/users/:userId/role", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = (req.user as Express.User).id;
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      
      if (!role || !["admin", "moderator", "user"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUser(userId, { role });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the activity
      await logUserActivity(
        adminId,
        "change_user_role",
        userId,
        { newRole: role },
        req.ip
      );

      // Omit password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Change user role error:", error);
      res.status(500).json({ message: "Failed to change user role" });
    }
  });

  app.put("/api/admin/users/:userId/status", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = (req.user as Express.User).id;
      const userId = parseInt(req.params.userId);
      const { status } = req.body;
      
      if (!status || !["active", "suspended", "banned"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedUser = await storage.changeUserStatus(userId, status);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the activity
      await logUserActivity(
        adminId,
        "change_user_status",
        userId,
        { newStatus: status },
        req.ip
      );

      // Omit password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Change user status error:", error);
      res.status(500).json({ message: "Failed to change user status" });
    }
  });

  app.get("/api/admin/audit-logs", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        activityType: req.query.activityType as string,
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined
      };

      const logs = await storage.getAuditLogs(page, limit, filters);
      res.json(logs);
    } catch (error) {
      console.error("Audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.put("/api/admin/users/:userId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = (req.user as Express.User).id;
      const userId = parseInt(req.params.userId);
      const { username, email, role, status, resetPassword } = req.body;

      // Validate required fields
      if (!username || !email || !role) {
        return res.status(400).json({ message: "Username, email, and role are required" });
      }

      // Validate role
      const validRoles = ["normal", "moderator", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be normal, moderator, or admin" });
      }

      // Validate status
      const validStatuses = ["active", "inactive", "suspended"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if username is taken by another user
      if (username !== existingUser.username) {
        const userWithUsername = await storage.getUserByUsername(username);
        if (userWithUsername && userWithUsername.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      // Check if email is taken by another user
      if (email !== existingUser.email) {
        const userWithEmail = await storage.getUserByEmail(email);
        if (userWithEmail && userWithEmail.id !== userId) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Prepare update data
      const updateData: any = {
        username,
        email,
        role,
        ...(status && { status })
      };

      // Handle password reset if requested
      if (resetPassword) {
        const hashedPassword = await hashPassword("12345678");
        updateData.password = hashedPassword;
      }

      // Update the user
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the activity
      const activityDetails: any = { 
        updatedFields: Object.keys(updateData).filter(key => key !== 'password'),
        updatedBy: "admin"
      };
      if (resetPassword) {
        activityDetails.passwordReset = true;
      }

      await logUserActivity(
        adminId,
        "update_user",
        userId,
        activityDetails,
        req.ip
      );

      // Omit password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
}

// Add interface for LocalStrategy info
interface LocalStrategyInfo {
  message?: string;
}