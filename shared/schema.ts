import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const UserRole = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  PREMIUM: 'premium',
  NORMAL: 'normal',
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
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default(UserRole.NORMAL),
  status: text("status").notNull().default(UserStatus.ACTIVE),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

// Movie model for caching movie data
export const movies = pgTable("movies", {
  id: serial("id").primaryKey(),
  movieId: text("movie_id").notNull().unique(), // Original _id from API
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  originName: text("origin_name"),
  posterUrl: text("poster_url"),
  thumbUrl: text("thumb_url"),
  year: integer("year"),
  type: text("type"), // 'movie' or 'tv'
  quality: text("quality"),
  lang: text("lang"),
  time: text("time"), // Duration
  view: integer("view").default(0),
  description: text("description"),
  status: text("status"),
  trailerUrl: text("trailer_url"),
  categories: jsonb("categories").default([]),
  countries: jsonb("countries").default([]),
  actors: text("actors"),
  directors: text("directors"),
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
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

// Watchlist model for user's saved movies
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  movieSlug: text("movie_slug").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
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
} as const;

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
export const insertContentApprovalSchema = createInsertSchema(contentApprovals).omit({ 
  id: true, submittedAt: true, reviewedAt: true 
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type InsertContentApproval = z.infer<typeof insertContentApprovalSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type User = typeof users.$inferSelect;
export type Movie = typeof movies.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;
export type ContentApproval = typeof contentApprovals.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// Define relations between tables
export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
  watchlist: many(watchlist),
  submittedContent: many(contentApprovals, { relationName: "submittedBy" }),
  reviewedContent: many(contentApprovals, { relationName: "reviewedBy" }),
  auditLogs: many(auditLogs),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  episodes: many(episodes),
  comments: many(comments),
  watchlist: many(watchlist),
  contentApprovals: many(contentApprovals),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  movie: one(movies, {
    fields: [comments.movieSlug],
    references: [movies.slug],
  }),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
  movie: one(movies, {
    fields: [watchlist.movieSlug],
    references: [movies.slug],
  }),
}));

export const episodesRelations = relations(episodes, ({ one }) => ({
  movie: one(movies, {
    fields: [episodes.movieSlug],
    references: [movies.slug],
  }),
}));

export const contentApprovalsRelations = relations(contentApprovals, ({ one }) => ({
  movie: one(movies, {
    fields: [contentApprovals.movieId],
    references: [movies.id],
  }),
  submittedBy: one(users, {
    fields: [contentApprovals.submittedByUserId],
    references: [users.id],
    relationName: "submittedBy",
  }),
  reviewedBy: one(users, {
    fields: [contentApprovals.reviewedByUserId],
    references: [users.id],
    relationName: "reviewedBy",
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// API Response Types
export type MovieListItem = {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  poster_url: string;
  thumb_url: string;
  year: number;
  tmdb: {
    type: 'movie' | 'tv';
    id: string;
    season?: number;
    vote_average?: number;
    vote_count?: number;
  };
  imdb?: string;
  modified: {
    time: number;
  };
};

export type MovieListResponse = {
  items: MovieListItem[];
  pagination: {
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
    episode_current: string;
    episode_total: string;
    view: number;
    actor: string[];
    director: string[];
    category: Category[];
    country: Country[];
  };
  episodes: EpisodeServer[];
};
