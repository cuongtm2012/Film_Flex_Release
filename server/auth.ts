import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Express, Request, Response, NextFunction, RequestHandler } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { config } from "./config.js";

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
  
  res.status(401).json({ message: "Authentication required" });
};

// Middleware for checking if user is admin
export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Access denied - Administrator privileges required" });
};

// Middleware for checking if user is admin or moderator
export const isAdminOrModerator: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user?.role === "admin" || req.user?.role === "moderator")) {
    return next();
  }
  res.status(403).json({ message: "Access denied - Moderator privileges required" });
};

// Middleware for checking if user is active
export const isActive: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user?.status === "active") {
    return next();
  }
  res.status(403).json({ message: "Your account is not active. Please contact support." });
};

export function setupAuth(app: Express): void {
  // Build cookie configuration based on environment
  const cookieConfig: any = {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
  };

  // Fix session cookie configuration for better cross-origin support
  if (process.env.NODE_ENV === "production") {
    cookieConfig.secure = true;
    cookieConfig.sameSite = 'none';
    cookieConfig.domain = ".phimgg.com"; // Only set domain in production
  } else {
    cookieConfig.secure = false;
    cookieConfig.sameSite = 'lax';
    // Don't set domain for development to fix localhost issues
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "filmflex-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: cookieConfig,
    store: storage.sessionStore,
    name: 'filmflex.sid',
    rolling: true, // Refresh session with each request
    proxy: process.env.NODE_ENV === "production", // Trust proxy in production
  };

  // Only log important auth setup in production
  if (process.env.NODE_ENV !== "production") {
    console.log('[Auth] Environment:', process.env.NODE_ENV);
    console.log('[Auth] Session cookie config:', cookieConfig);
    console.log('[Auth] Client URL:', config.clientUrl);
  }

  // Trust first proxy in production
  if (process.env.NODE_ENV === 'production') {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // ALWAYS initialize Local Strategy for username/password login
  // This ensures admin and regular users can login with credentials
  // regardless of Cloudflare OAuth configuration
  passport.use(
    new LocalStrategy(async (username: string, password: string, done) => {
      try {
        const user = await storage.getUserByUsername(username);        
        if (!user) {
          return done(null, false, { message: "We couldn't find an account with that username. Please check your username or create a new account." });
        }

        // Check if user has a password (for OAuth users)
        if (!user.password) {
          return done(null, false, { message: "Please sign in with Google" });
        }

        const passwordsMatch = await comparePasswords(password, user.password);
        if (!passwordsMatch) {
          return done(null, false, { message: "The password you entered is incorrect. Please try again or reset your password." });
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
  
  console.log('✅ Local authentication strategy initialized');
  
  // Check if we should use Cloudflare Worker for OAuth
  if (config.useCloudflareOAuth) {
    console.log('☁️  OAuth handled by Cloudflare Worker - Local OAuth strategies disabled');
    
    // Set up proxy routes to Cloudflare Worker for OAuth
    app.get("/api/auth/google", (req: Request, res: Response) => {
      res.redirect(`${config.cloudflareWorkerUrl}/api/auth/google`);
    });

    app.get("/api/auth/facebook", (req: Request, res: Response) => {
      res.redirect(`${config.cloudflareWorkerUrl}/api/auth/facebook`);
    });

    // Handle OAuth callbacks from Cloudflare Worker
    app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
      // This would be called after Cloudflare Worker processes OAuth
      // Worker should redirect here with user data or JWT token
      const token = req.query.token as string;
      if (token) {
        // Process the JWT token from Cloudflare Worker
        // You'd need to verify and decode the JWT here
        res.redirect("/?auth=success");
      } else {
        res.redirect("/auth?error=oauth_failed");
      }
    });

    app.get("/api/auth/facebook/callback", async (req: Request, res: Response) => {
      const token = req.query.token as string;
      if (token) {
        res.redirect("/?auth=success");
      } else {
        res.redirect("/auth?error=oauth_failed");
      }
    });
    
  } else {
    // Use local OAuth strategies (development mode)
    console.log('🔑 Using local OAuth strategies');
    
    // Google OAuth Strategy
    if (config.googleClientId && config.googleClientSecret) {
      // Only log Google OAuth setup in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('Setting up Google OAuth strategy');
      }
      
      // Determine the correct callback URL based on environment
      const callbackURL = process.env.NODE_ENV === 'production' 
        ? "https://phimgg.com/api/auth/google/callback"
        : "http://localhost:5000/api/auth/google/callback";
      
      passport.use(
        new GoogleStrategy(
          {
            clientID: config.googleClientId,
            clientSecret: config.googleClientSecret,
            callbackURL: callbackURL,
          },
          async (_accessToken, _refreshToken, profile, done) => {
            try {
              // Check if user already exists with this Google ID
              let user = await storage.getUserByGoogleId(profile.id);
              
              if (user) {
                // User exists, log them in
                await logUserActivity(user.id, "google_login", null, null, null);
                const { password: _, ...userWithoutPassword } = user;
                return done(null, userWithoutPassword);
              }

              // Check if user exists with same email
              const emailUser = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
              if (emailUser) {
                // Link Google account to existing user
                await storage.updateUser(emailUser.id, { 
                  googleId: profile.id,
                  avatar: profile.photos?.[0]?.value || emailUser.avatar 
                });
                await logUserActivity(emailUser.id, "google_account_linked", null, null, null);
                const { password: _, ...userWithoutPassword } = emailUser;
                return done(null, userWithoutPassword);
              }

              // Create new user
              const newUser = await storage.createUser({
                username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || `user_${profile.id}`,
                email: profile.emails?.[0]?.value || '',
                password: '', // Empty password for OAuth users
                role: 'normal',
                status: 'active',
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value || null,
                displayName: profile.displayName || null
              });

              await logUserActivity(newUser.id, "google_register", null, null, null);
              const { password: _, ...userWithoutPassword } = newUser;
              return done(null, userWithoutPassword);
            } catch (error) {
              return done(error as Error);
            }
          }
        )
      );
    } else {
      console.log('ℹ️  Local Google OAuth disabled - using Cloudflare Worker OAuth in production');
    }

    // Facebook OAuth Strategy  
    if (config.facebookAppId && config.facebookAppSecret) {
      // Only log Facebook OAuth setup in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('Setting up Facebook OAuth strategy');
      }
      
      // Determine the correct callback URL based on environment
      const callbackURL = process.env.NODE_ENV === 'production' 
        ? "https://phimgg.com/api/auth/facebook/callback"
        : "http://localhost:5000/api/auth/facebook/callback";
      
      passport.use(
        new FacebookStrategy(
          {
            clientID: config.facebookAppId,
            clientSecret: config.facebookAppSecret,
            callbackURL: callbackURL,
            profileFields: ['id', 'displayName', 'photos'] // Removed 'email' as it's no longer available
          },
          async (_accessToken, _refreshToken, profile, done) => {
            try {
              // Check if user already exists with this Facebook ID
              let user = await storage.getUserByFacebookId(profile.id);
              
              if (user) {
                // User exists, log them in
                await logUserActivity(user.id, "facebook_login", null, null, null);
                const { password: _, ...userWithoutPassword } = user;
                return done(null, userWithoutPassword);
              }

              // For new users, since we can't get email from Facebook anymore,
              // we'll create a placeholder email or ask user to provide it later
              const placeholderEmail = `facebook_${profile.id}@facebook.local`;

              // Check if a user exists with the placeholder email (shouldn't happen, but just in case)
              const emailUser = await storage.getUserByEmail(placeholderEmail);
              if (emailUser) {
                // Link Facebook account to existing user
                await storage.updateUser(emailUser.id, { 
                  facebookId: profile.id,
                  avatar: profile.photos?.[0]?.value || emailUser.avatar 
                });
                await logUserActivity(emailUser.id, "facebook_account_linked", null, null, null);
                const { password: _, ...userWithoutPassword } = emailUser;
                return done(null, userWithoutPassword);
              }

              // Create new user with placeholder email
              const newUser = await storage.createUser({
                username: profile.displayName || `facebook_user_${profile.id}`,
                email: placeholderEmail, // Placeholder email since Facebook doesn't provide it anymore
                password: '', // Empty password for OAuth users
                role: 'normal',
                status: 'active',
                facebookId: profile.id,
                avatar: profile.photos?.[0]?.value || null,
                displayName: profile.displayName || null
              });

              await logUserActivity(newUser.id, "facebook_register", null, null, null);
              const { password: _, ...userWithoutPassword } = newUser;
              return done(null, userWithoutPassword);
            } catch (error) {
              return done(error as Error);
            }
          }
        )
      );
    } else {
      console.log('ℹ️  Local Facebook OAuth disabled - using Cloudflare Worker OAuth in production');
    }
  }

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
      // Validate required fields
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      // Check if user exists by username
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if user exists by email
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Remove confirmPassword if it exists
      const { confirmPassword, ...userData } = req.body;

      // Create user with default role
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: "normal", // Default role
        status: "active", // Default status
      });

      // Log the registration
      await logUserActivity(user.id, "register", null, null, req.ip);

      // Log the user in
      req.login(user, (err: Error | null) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res.status(500).json({ message: "Registration successful but login failed. Please try logging in manually." });
        }
        
        // Omit password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return res.status(400).json({ message: "Username or email already exists" });
        }
        if (error.message.includes('validation')) {
          return res.status(400).json({ message: "Invalid input data" });
        }
      }
      
      res.status(500).json({ message: "Registration failed. Please try again." });
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
      const allowedUpdates = ["email", "displayName", "avatar", "username"]; // Added username to allowed updates
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj: Record<string, any>, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      // Check if username is being updated and if it's already taken
      if (updates.username) {
        const existingUser = await storage.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      // Check if email is being updated and if it's already taken
      if (updates.email) {
        const existingEmailUser = await storage.getUserByEmail(updates.email);
        if (existingEmailUser && existingEmailUser.id !== userId) {
          return res.status(400).json({ message: "Email already exists" });
        }
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
      const user = await storage.getUser(userId);      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has a password (OAuth users cannot change password)
      if (!user.password) {
        return res.status(400).json({ message: "OAuth users cannot change password" });
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
      );      // Omit password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // DELETE route for admin user deletion
  app.delete("/api/admin/users/:userId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = (req.user as Express.User).id;
      const userId = parseInt(req.params.userId);

      // Validate userId
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admin from deleting themselves
      if (userId === adminId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      // Delete the user
      const deletedUser = await storage.deleteUser(userId);
      if (!deletedUser) {
        return res.status(500).json({ message: "Failed to delete user" });
      }

      // Log the activity
      await logUserActivity(
        adminId,
        "delete_user",
        userId,
        { 
          deletedUsername: existingUser.username,
          deletedEmail: existingUser.email,
          deletedRole: existingUser.role
        },
        req.ip
      );

      res.json({ 
        status: true, 
        message: "User deleted successfully",
        deletedUser: {
          id: userId,
          username: existingUser.username,
          email: existingUser.email
        }
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Google OAuth routes
  if (config.googleClientId && config.googleClientSecret) {
    app.get("/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );
    
    app.get("/api/auth/google/callback",
      passport.authenticate("google", { 
        failureRedirect: "/auth?error=google_auth_failed",
        session: true // Ensure session is maintained
      }),
      (req: Request, res: Response) => {
        // Remove excessive session logging from Google OAuth callback
        req.session.save((saveErr) => {
          if (saveErr) {
            // Only log errors, not successful saves
            console.error('[Google OAuth] Session save error:', saveErr);
            return res.redirect("/auth?error=session_save_failed");
          }
          
          res.redirect("/");
        });
      }
    );
  }

  // Facebook OAuth routes
  if (config.facebookAppId && config.facebookAppSecret) {
    app.get("/api/auth/facebook",
      passport.authenticate("facebook") // Removed scope: ["email"] as it's no longer supported
    );
    
    app.get("/api/auth/facebook/callback",
      passport.authenticate("facebook", { 
        failureRedirect: "/auth?error=facebook_auth_failed",
        session: true // Ensure session is maintained
      }),
      (req: Request, res: Response) => {
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[Facebook OAuth] Session save error:', saveErr);
            return res.redirect("/auth?error=session_save_failed");
          }
          
          res.redirect("/");
        });
      }
    );
  }

  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security reasons
        return res.status(200).json({ 
          message: "If an account with this email exists, we've sent a password reset link." 
        });
      }

      // Generate reset token (simple implementation - in production use crypto.randomBytes)
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in database (you'll need to add this to your storage)
      await storage.createPasswordResetToken(user.id, resetToken, resetExpiry);

      // Create reset link
      const resetLink = `${config.clientUrl}/reset-password?token=${resetToken}`;
      
      // Prepare email data
      const emailData = {
        username: user.displayName || user.username,
        resetLink: resetLink,
        expirationTime: '1 hour'
      };

      // Send password reset email using the email service
      const { emailService } = await import('./services/emailService.js');
      const emailSent = await emailService.sendPasswordResetEmail(email, emailData);

      if (!emailSent) {
        console.warn(`Failed to send password reset email to ${email}`);
        // Still return success to prevent email enumeration
      }

      // For development, also log it to console as backup
      if (config.nodeEnv === 'development') {
        console.log(`🔗 Password reset link for ${email}: ${resetLink}`);
        console.log(`📧 Email sent: ${emailSent ? '✅ Success' : '❌ Failed'}`);
      }

      // Log the activity
      await logUserActivity(user.id, "password_reset_requested", null, { email }, req.ip);

      res.status(200).json({ 
        message: "If an account with this email exists, we've sent a password reset link to your email address." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Find user by reset token
      const resetData = await storage.getPasswordResetToken(token);
      if (!resetData) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > resetData.expiresAt) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await storage.updateUser(resetData.userId, { password: hashedPassword });

      // Delete the reset token
      await storage.deletePasswordResetToken(token);

      // Log the activity
      await logUserActivity(resetData.userId, "password_reset_completed", null, null, req.ip);

      res.status(200).json({ message: "Password has been successfully reset" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}

// Add interface for LocalStrategy info
interface LocalStrategyInfo {
  message?: string;
}