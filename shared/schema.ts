import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Section type definition
export const Section = {
  TRENDING_NOW: 'trending_now',
  LATEST_MOVIES: 'latest_movies',
  TOP_RATED: 'top_rated',
  POPULAR_TV: 'popular_tv',
  ANIME: 'anime'
} as const;

// Movie model for caching movie data
export const movies = pgTable("movies", {
  // Base fields
  id: serial("id").primaryKey(),
  movieId: text("movie_id").notNull().unique(), // Original _id from API
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  originName: text("origin_name"),
  posterUrl: text("poster_url"),
  thumbUrl: text("thumb_url"),
  year: integer("year"),
  type: text("type"),
  quality: text("quality"),
  lang: text("lang"),
  time: text("time"), // Duration
  view: integer("view").default(0),
  description: text("description"),
  status: text("status").default("ongoing"),
  trailerUrl: text("trailer_url"),
  
  // Section and recommendation fields
  section: text("section"),
  isRecommended: boolean("is_recommended").default(false),
  
  // Additional metadata
  categories: jsonb("categories").default([]),
  countries: jsonb("countries").default([]),
  actors: text("actors"),
  directors: text("directors"),
  episodeCurrent: text("episode_current"),
  episodeTotal: text("episode_total"),
  
  // Tracking fields
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
});

// Session model for storing user sessions
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// User roles enum - Updated with default RBAC roles
export const UserRole = {
  ADMIN: 'Admin',
  CONTENT_MANAGER: 'Content Manager', 
  VIEWER: 'Viewer',
  // Legacy roles for backward compatibility
  MODERATOR: 'moderator',
  PREMIUM: 'premium',
  NORMAL: 'normal',
} as const;

// Permission modules for organizing permissions
export const PermissionModule = {
  USER_MANAGEMENT: 'user_management',
  CONTENT_MANAGEMENT: 'content_management',
  SYSTEM: 'system',
  ROLE_MANAGEMENT: 'role_management',
  VIEWING: 'viewing',
} as const;

// Common permissions enum for type safety
export const Permissions = {
  // User Management
  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_MANAGE_ROLES: 'user.manage_roles',
  USER_VIEW_ACTIVITY: 'user.view_activity',
  
  // Content Management
  CONTENT_CREATE: 'content.create',
  CONTENT_READ: 'content.read',
  CONTENT_UPDATE: 'content.update',
  CONTENT_DELETE: 'content.delete',
  CONTENT_APPROVE: 'content.approve',
  CONTENT_REJECT: 'content.reject',
  CONTENT_MODERATE: 'content.moderate',
  
  // System Administration
  SYSTEM_ADMIN: 'system.admin',
  SYSTEM_ANALYTICS: 'system.analytics',
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_API_KEYS: 'system.api_keys',
  SYSTEM_AUDIT_LOGS: 'system.audit_logs',
  
  // Role Management
  ROLE_CREATE: 'role.create',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_ASSIGN_PERMISSIONS: 'role.assign_permissions',
  
  // Viewing
  CONTENT_VIEW: 'content.view',
  CONTENT_SEARCH: 'content.search',
  CONTENT_WATCHLIST: 'content.watchlist',
  CONTENT_COMMENT: 'content.comment',
  CONTENT_RATE: 'content.rate',
} as const;

// User status enum
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

// User model for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default(UserRole.NORMAL),
  status: text("status").notNull().default(UserStatus.ACTIVE),
  
  // OAuth fields
  googleId: text("google_id").unique(),
  facebookId: text("facebook_id").unique(),
  avatar: text("avatar"),
  displayName: text("display_name"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

// Roles model
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Permissions model
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  module: text("module").notNull(), // e.g., 'user_management', 'content_management'
  action: text("action").notNull(), // e.g., 'create', 'read', 'update', 'delete'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Role-Permission mapping
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
});

// Episode model for caching episode data
export const episodes = pgTable("episodes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  movieSlug: text("movie_slug").notNull(),
  serverName: text("server_name").notNull(),
  filename: text("filename"),
  linkEmbed: text("link_embed").notNull(),
  linkM3u8: text("link_m3u8"),
});

// Comments model for user comments
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  movieSlug: text("movie_slug").notNull(),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  dislikes: integer("dislikes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Comment Reactions model for tracking individual user reactions
export const userCommentReactions = pgTable("user_comment_reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull(), // 'like' or 'dislike'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Ensure one reaction per user per comment
  uniqueUserComment: unique().on(table.userId, table.commentId),
}));

// Movie Reactions model for tracking user reactions to movies
export const movieReactions = pgTable("movie_reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  movieSlug: text("movie_slug").notNull(),
  reactionType: text("reaction_type").notNull(), // 'like', 'dislike', or 'heart'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate reaction types per user per movie while allowing multiple different reaction types
  uniqueUserMovieReaction: unique().on(table.userId, table.movieSlug, table.reactionType),
}));

// Watchlist model for user's saved movies
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  movieSlug: text("movie_slug").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// View History model for tracking watched movies
export const viewHistory = pgTable("view_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  movieSlug: text("movie_slug").notNull(),
  lastViewedAt: timestamp("last_viewed_at").defaultNow().notNull(),
  viewCount: integer("view_count").default(1),
  progress: integer("progress").default(0), // Stores watch progress in seconds
});

// Content Status enum
export const ContentStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Content Approvals model for tracking moderation
export const contentApprovals = pgTable("content_approvals", {
  id: serial("id").primaryKey(),
  movieId: integer("movie_id").notNull(),
  submittedByUserId: integer("submitted_by_user_id").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id"),
  status: text("status").notNull().default(ContentStatus.PENDING),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  comments: text("comments"),
});

// API Key status enum
export const ApiKeyStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  REVOKED: 'revoked',
} as const;

// User Activity Types enum
export const ActivityType = {
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_STATUS_CHANGED: 'user_status_changed',
  USER_DELETED: 'user_deleted',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  CONTENT_SUBMITTED: 'content_submitted',
  CONTENT_APPROVED: 'content_approved',
  CONTENT_REJECTED: 'content_rejected',
  API_KEY_CREATED: 'api_key_created',
  API_KEY_UPDATED: 'api_key_updated',
  API_KEY_REVOKED: 'api_key_revoked',
  API_REQUEST: 'api_request',
} as const;

// API Keys model for API access management
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  status: text("status").notNull().default(ApiKeyStatus.ACTIVE),
  permissions: jsonb("permissions").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  rateLimit: integer("rate_limit").default(1000), // requests per day
  requestCount: integer("request_count").default(0),
  ipRestrictions: jsonb("ip_restrictions").default([]),
});

// API Requests model for tracking API usage
export const apiRequests = pgTable("api_requests", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  status: integer("status").notNull(),
  responseTime: integer("response_time").notNull(), // in milliseconds
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Analytics Events model for tracking user behavior
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  properties: jsonb("properties").default({}),
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  deviceType: text("device_type"),
  browser: text("browser"),
  operatingSystem: text("operating_system"),
  screenResolution: text("screen_resolution"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Content Performance model for tracking content metrics
export const contentPerformance = pgTable("content_performance", {
  id: serial("id").primaryKey(),
  movieId: integer("movie_id").notNull().references(() => movies.id, { onDelete: "cascade" }),
  views: integer("views").default(0),
  uniqueViewers: integer("unique_viewers").default(0),
  completionRate: integer("completion_rate").default(0), // percentage
  averageWatchTime: integer("average_watch_time").default(0), // seconds
  likes: integer("likes").default(0),
  dislikes: integer("dislikes").default(0),
  shares: integer("shares").default(0),
  clickThroughRate: integer("click_through_rate").default(0), // percentage
  bounceRate: integer("bounce_rate").default(0), // percentage
  date: timestamp("date").defaultNow().notNull(),
});

// Audit Logs model for tracking admin/moderator actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  targetId: integer("target_id"), // ID of affected resource (user, movie, etc.)
  details: jsonb("details"), // Additional context
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, lastLogin: true });
export const insertMovieSchema = createInsertSchema(movies).omit({ id: true, modifiedAt: true });
export const insertEpisodeSchema = createInsertSchema(episodes).omit({ id: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, likes: true, dislikes: true, createdAt: true });
export const insertWatchlistSchema = createInsertSchema(watchlist).omit({ id: true, addedAt: true });
export const insertViewHistorySchema = createInsertSchema(viewHistory).omit({ id: true, lastViewedAt: true });
export const insertContentApprovalSchema = createInsertSchema(contentApprovals).omit({ 
  id: true, submittedAt: true, reviewedAt: true 
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ 
  id: true, createdAt: true, lastUsedAt: true, requestCount: true 
});
export const insertApiRequestSchema = createInsertSchema(apiRequests).omit({ id: true, timestamp: true });
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, timestamp: true });
export const insertContentPerformanceSchema = createInsertSchema(contentPerformance).omit({ id: true, date: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, createdAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });
export const insertUserCommentReactionSchema = createInsertSchema(userCommentReactions).omit({ id: true });
export const insertMovieReactionSchema = createInsertSchema(movieReactions).omit({ id: true });

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type InsertViewHistory = z.infer<typeof insertViewHistorySchema>;
export type InsertContentApproval = z.infer<typeof insertContentApprovalSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type InsertApiRequest = z.infer<typeof insertApiRequestSchema>;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type InsertContentPerformance = z.infer<typeof insertContentPerformanceSchema>;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type InsertUserCommentReaction = z.infer<typeof insertUserCommentReactionSchema>;
export type InsertMovieReaction = z.infer<typeof insertMovieReactionSchema>;

export type User = typeof users.$inferSelect;
export type Movie = typeof movies.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Comment = typeof comments.$inferSelect & { username?: string }; // Add username field from join
export type Watchlist = typeof watchlist.$inferSelect;
export type ViewHistory = typeof viewHistory.$inferSelect;
export type ContentApproval = typeof contentApprovals.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApiRequest = typeof apiRequests.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type ContentPerformance = typeof contentPerformance.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserCommentReaction = typeof userCommentReactions.$inferSelect;
export type MovieReaction = typeof movieReactions.$inferSelect;

// Define relations between tables using proper Drizzle types
export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments, { relationName: 'userComments' }),
  watchlist: many(watchlist, { relationName: 'userWatchlist' }),
  viewHistory: many(viewHistory, { relationName: 'userViewHistory' }),
  submittedContent: many(contentApprovals, { relationName: "submittedBy" }),
  reviewedContent: many(contentApprovals, { relationName: "reviewedBy" }),
  auditLogs: many(auditLogs, { relationName: 'userAuditLogs' }),
  apiKeys: many(apiKeys, { relationName: 'userApiKeys' }),
  analyticsEvents: many(analyticsEvents, { relationName: 'userAnalytics' }),
  commentReactions: many(userCommentReactions, { relationName: 'userReactions' }),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  episodes: many(episodes, { relationName: 'movieEpisodes' }),
  comments: many(comments, { relationName: 'movieComments' }),
  watchlist: many(watchlist, { relationName: 'movieWatchlist' }),
  viewHistory: many(viewHistory, { relationName: 'movieViewHistory' }),
  contentApprovals: many(contentApprovals, { relationName: 'movieApprovals' }),
  contentPerformance: many(contentPerformance, { relationName: 'moviePerformance' }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id]
  }),
  movie: one(movies, {
    fields: [comments.movieSlug],
    references: [movies.slug]
  }),
  reactions: many(userCommentReactions, { relationName: 'commentReactions' }),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id]
  }),
  movie: one(movies, {
    fields: [watchlist.movieSlug],
    references: [movies.slug]
  }),
}));

export const viewHistoryRelations = relations(viewHistory, ({ one }) => ({
  user: one(users, {
    fields: [viewHistory.userId],
    references: [users.id]
  }),
  movie: one(movies, {
    fields: [viewHistory.movieSlug],
    references: [movies.slug]
  }),
}));

export const episodesRelations = relations(episodes, ({ one }) => ({
  movie: one(movies, {
    fields: [episodes.movieSlug],
    references: [movies.slug]
  }),
}));

export const contentApprovalsRelations = relations(contentApprovals, ({ one }) => ({
  movie: one(movies, {
    fields: [contentApprovals.movieId],
    references: [movies.id]
  }),
  submittedBy: one(users, {
    fields: [contentApprovals.submittedByUserId],
    references: [users.id]
  }),
  reviewedBy: one(users, {
    fields: [contentApprovals.reviewedByUserId],
    references: [users.id]
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id]
  }),
  apiRequests: many(apiRequests, { relationName: 'keyRequests' }),
}));

export const apiRequestsRelations = relations(apiRequests, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiRequests.apiKeyId],
    references: [apiKeys.id]
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id]
  }),
}));

export const contentPerformanceRelations = relations(contentPerformance, ({ one }) => ({
  movie: one(movies, {
    fields: [contentPerformance.movieId],
    references: [movies.id]
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions, { relationName: 'rolePerms' }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions, { relationName: 'permRoles' }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id]
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id]
  }),
}));

export const userCommentReactionsRelations = relations(userCommentReactions, ({ one }) => ({
  user: one(users, {
    fields: [userCommentReactions.userId],
    references: [users.id]
  }),
  comment: one(comments, {
    fields: [userCommentReactions.commentId],
    references: [comments.id]
  }),
}));

export const movieReactionsRelations = relations(movieReactions, ({ one }) => ({
  user: one(users, {
    fields: [movieReactions.userId],
    references: [users.id]
  }),
  movie: one(movies, {
    fields: [movieReactions.movieSlug],
    references: [movies.slug]
  }),
}));

// API Response Types
export type MovieListItem = {
  id?: number;     // Database ID
  _id?: string;    // Original API ID
  movieId?: string; // Alternative API ID
  name: string;
  slug: string;
  origin_name?: string | null;
  originName?: string | null;
  poster_url?: string | null;
  posterUrl?: string | null;
  thumb_url?: string | null;
  thumbUrl?: string | null;
  year?: number | null;
  type?: string | null;
  tmdb?: {
    type?: 'movie' | 'tv';
    id?: string;
    season?: number;
    vote_average?: number;
    vote_count?: number;
  };
  imdb?: string;
  modified?: {
    time?: number;
  };
};

export type MovieListResponse = {
  status?: boolean;
  items: MovieListItem[];
  total?: number;
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    totalItemsPerPage: number;
  };
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Country = {
  id: string;
  name: string;
  slug: string;
};

export type EpisodeServer = {
  server_name: string;
  server_data: {
    name: string;
    slug: string;
    filename: string;
    link_embed: string;
    link_m3u8: string;
  }[];
};

export type RelatedSeason = {
  movieId: string;
  name: string;
  slug: string;
  originName?: string;
  year?: number;
  episodeCurrent?: string;
  episodeTotal?: string;
  thumbUrl?: string;
  posterUrl?: string;
};

export type MovieDetailResponse = {
  movie: {
    _id: string;
    name: string;
    slug: string;
    origin_name: string;
    content: string;
    type: string;
    status: string;
    thumb_url: string;
    poster_url: string;
    trailer_url?: string;
    time: string;
    quality: string;
    lang: string;
    year?: number | null;
    episode_current: string;
    episode_total: string;
    view: number;
    actor: string[];
    director: string[];
    category: Category[];
    country: Country[];
    related_seasons?: RelatedSeason[];
  };
  episodes: EpisodeServer[];
};

// Helper function to convert nullable strings to undefined
export function nullToUndefined<T>(obj: T): { [K in keyof T]: T[K] extends null ? undefined : T[K] } {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === null) {
      // Fixing type assignment issue by ensuring compatibility
      result[key] = undefined as unknown as T[Extract<keyof T, string>];
    }
  }
  return result as { [K in keyof T]: T[K] extends null ? undefined : T[K] };
}

// Add helper functions for data conversion
export function convertToMovieModel(data: MovieDetailResponse): InsertMovie {
  return {
    movieId: data.movie._id,
    slug: data.movie.slug,
    name: data.movie.name,
    originName: data.movie.origin_name || null,
    posterUrl: data.movie.poster_url || null,
    thumbUrl: data.movie.thumb_url || null,
    type: data.movie.type || null,
    status: data.movie.status || null,
    description: data.movie.content || null,
    time: data.movie.time || null,
    quality: data.movie.quality || null,
    lang: data.movie.lang || null,
    year: null, // Extract from data if available
    view: data.movie.view || 0,
    categories: data.movie.category || [],
    countries: data.movie.country || [],
    actors: data.movie.actor?.join(", ") || null,
    directors: data.movie.director?.join(", ") || null,
    trailerUrl: data.movie.trailer_url || null,
    // Add episode fields
    episodeCurrent: data.movie.episode_current || 'Full',
    episodeTotal: data.movie.episode_total || '1',
  };
}

export function convertToEpisodeModels(data: MovieDetailResponse): InsertEpisode[] {
  const episodes: InsertEpisode[] = [];
  
  for (const serverEpisode of data.episodes || []) {
    for (const episodeData of serverEpisode.server_data) {
      episodes.push({
        name: episodeData.name,
        slug: episodeData.slug,
        movieSlug: data.movie.slug,
        serverName: serverEpisode.server_name,
        filename: episodeData.filename || null,
        linkEmbed: episodeData.link_embed,
        linkM3u8: episodeData.link_m3u8 || null,
      });
    }
  }
  
  return episodes;
}

// Helper function to normalize text for search
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
