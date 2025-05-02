import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMovieSchema = createInsertSchema(movies).omit({ id: true, modifiedAt: true });
export const insertEpisodeSchema = createInsertSchema(episodes).omit({ id: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, likes: true, dislikes: true, createdAt: true });
export const insertWatchlistSchema = createInsertSchema(watchlist).omit({ id: true, addedAt: true });

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;

export type User = typeof users.$inferSelect;
export type Movie = typeof movies.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;

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
