import { 
  User, InsertUser, 
  Movie, InsertMovie, 
  Episode, InsertEpisode, 
  Comment, InsertComment, 
  Watchlist, InsertWatchlist,
  ContentApproval, InsertContentApproval,
  AuditLog, InsertAuditLog,
  MovieListResponse, MovieDetailResponse,
  users, movies, episodes, comments, watchlist, contentApprovals, auditLogs,
  UserRole, UserStatus, ContentStatus, ActivityType
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";
import { promisify } from "util";
import { scrypt, randomBytes } from "crypto";

const scryptAsync = promisify(scrypt);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  changeUserStatus(id: number, status: string): Promise<User | undefined>;
  getAllUsers(page: number, limit: number, filters?: {role?: string, status?: string, search?: string}): Promise<{ data: User[], total: number }>;
  
  // Movie methods
  getMovies(page: number, limit: number): Promise<{ data: Movie[], total: number }>;
  getMovieBySlug(slug: string): Promise<Movie | undefined>;
  saveMovie(movie: InsertMovie): Promise<Movie>;
  searchMovies(query: string, page: number, limit: number): Promise<{ data: Movie[], total: number }>;
  getMoviesByCategory(categorySlug: string, page: number, limit: number): Promise<{ data: Movie[], total: number }>;
  
  // Episode methods
  getEpisodesByMovieSlug(movieSlug: string): Promise<Episode[]>;
  getEpisodeBySlug(slug: string): Promise<Episode | undefined>;
  saveEpisode(episode: InsertEpisode): Promise<Episode>;
  
  // Comment methods
  getCommentsByMovieSlug(movieSlug: string, page: number, limit: number): Promise<{ data: Comment[], total: number }>;
  addComment(comment: InsertComment): Promise<Comment>;
  likeComment(commentId: number): Promise<void>;
  dislikeComment(commentId: number): Promise<void>;
  
  // Watchlist methods
  getWatchlist(userId: number): Promise<Movie[]>;
  addToWatchlist(watchlistItem: InsertWatchlist): Promise<void>;
  removeFromWatchlist(userId: number, movieSlug: string): Promise<void>;
  
  // Content Approval methods
  submitContentForApproval(approval: InsertContentApproval): Promise<ContentApproval>;
  approveContent(contentId: number, reviewerId: number, comments?: string): Promise<ContentApproval | undefined>;
  rejectContent(contentId: number, reviewerId: number, comments: string): Promise<ContentApproval | undefined>;
  getPendingContent(page: number, limit: number): Promise<{ data: ContentApproval[], total: number }>;
  getContentByUser(userId: number, page: number, limit: number, status?: string): Promise<{ data: ContentApproval[], total: number }>;
  
  // Audit Log methods
  addAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(page: number, limit: number, filters?: {activityType?: string, userId?: number}): Promise<{ data: AuditLog[], total: number }>;
  
  // Cache methods
  cacheMovieList(data: MovieListResponse, page: number): Promise<void>;
  cacheMovieDetail(data: MovieDetailResponse): Promise<void>;
  getMovieListCache(page: number): Promise<MovieListResponse | undefined>;
  getMovieDetailCache(slug: string): Promise<MovieDetailResponse | undefined>;
  
  // Session store for authentication
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private movies: Map<string, Movie>; // Key is slug
  private episodes: Map<string, Episode>; // Key is slug
  private comments: Map<number, Comment>;
  private watchlists: Watchlist[];
  private contentApprovals: Map<number, ContentApproval>;
  private auditLogs: Map<number, AuditLog>;
  private movieListCache: Map<number, MovieListResponse>; // Key is page number
  private movieDetailCache: Map<string, MovieDetailResponse>; // Key is slug
  
  sessionStore: session.Store;
  
  private currentUserId: number = 1;
  private currentMovieId: number = 1;
  private currentEpisodeId: number = 1;
  private currentCommentId: number = 1;
  private currentWatchlistId: number = 1;
  private currentApprovalId: number = 1;
  private currentAuditLogId: number = 1;

  constructor() {
    this.users = new Map();
    this.movies = new Map();
    this.episodes = new Map();
    this.comments = new Map();
    this.watchlists = [];
    this.contentApprovals = new Map();
    this.auditLogs = new Map();
    this.movieListCache = new Map();
    this.movieDetailCache = new Map();
    
    // Create memory store for sessions
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now, 
      updatedAt: now, 
      lastLogin: null,
      role: insertUser.role || UserRole.NORMAL,
      status: insertUser.status || UserStatus.ACTIVE
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      ...userData, 
      updatedAt: new Date() 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async changeUserStatus(id: number, status: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      status, 
      updatedAt: new Date() 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(page: number, limit: number, filters?: {role?: string, status?: string, search?: string}): Promise<{ data: User[], total: number }> {
    let allUsers = Array.from(this.users.values());
    
    if (filters) {
      if (filters.role) {
        allUsers = allUsers.filter(user => user.role === filters.role);
      }
      
      if (filters.status) {
        allUsers = allUsers.filter(user => user.status === filters.status);
      }
      
      if (filters.search) {
        const search = filters.search.toLowerCase();
        allUsers = allUsers.filter(user => 
          user.username.toLowerCase().includes(search) || 
          user.email.toLowerCase().includes(search)
        );
      }
    }
    
    const total = allUsers.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = allUsers.slice(start, end);
    
    return { data: paginatedUsers, total };
  }
  
  // Movie methods
  async getMovies(page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const allMovies = Array.from(this.movies.values());
    const total = allMovies.length;
    
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedMovies = allMovies.slice(start, end);
    
    return { data: paginatedMovies, total };
  }
  
  async getMovieBySlug(slug: string): Promise<Movie | undefined> {
    return this.movies.get(slug);
  }
  
  async saveMovie(movie: InsertMovie): Promise<Movie> {
    const id = this.currentMovieId++;
    const newMovie: Movie = { ...movie, id, modifiedAt: new Date() };
    this.movies.set(newMovie.slug, newMovie);
    return newMovie;
  }
  
  async searchMovies(query: string, page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const lowerQuery = query.toLowerCase();
    const matchingMovies = Array.from(this.movies.values()).filter(
      (movie) => 
        movie.name.toLowerCase().includes(lowerQuery) ||
        (movie.originName && movie.originName.toLowerCase().includes(lowerQuery)) ||
        (movie.description && movie.description.toLowerCase().includes(lowerQuery))
    );
    
    const total = matchingMovies.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedMovies = matchingMovies.slice(start, end);
    
    return { data: paginatedMovies, total };
  }
  
  async getMoviesByCategory(categorySlug: string, page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const matchingMovies = Array.from(this.movies.values()).filter(movie => {
      const categories = movie.categories as any[];
      return categories.some(category => category.slug === categorySlug);
    });
    
    const total = matchingMovies.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedMovies = matchingMovies.slice(start, end);
    
    return { data: paginatedMovies, total };
  }
  
  // Episode methods
  async getEpisodesByMovieSlug(movieSlug: string): Promise<Episode[]> {
    return Array.from(this.episodes.values()).filter(
      (episode) => episode.movieSlug === movieSlug
    );
  }
  
  async getEpisodeBySlug(slug: string): Promise<Episode | undefined> {
    return this.episodes.get(slug);
  }
  
  async saveEpisode(episode: InsertEpisode): Promise<Episode> {
    const id = this.currentEpisodeId++;
    const newEpisode: Episode = { ...episode, id };
    this.episodes.set(newEpisode.slug, newEpisode);
    return newEpisode;
  }
  
  // Comment methods
  async getCommentsByMovieSlug(movieSlug: string, page: number, limit: number): Promise<{ data: Comment[], total: number }> {
    const allComments = Array.from(this.comments.values())
      .filter(comment => comment.movieSlug === movieSlug)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const total = allComments.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedComments = allComments.slice(start, end);
    
    return { data: paginatedComments, total };
  }
  
  async addComment(comment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const now = new Date();
    const newComment: Comment = { 
      ...comment, 
      id, 
      likes: 0,
      dislikes: 0,
      createdAt: now 
    };
    
    this.comments.set(id, newComment);
    return newComment;
  }
  
  async likeComment(commentId: number): Promise<void> {
    const comment = this.comments.get(commentId);
    if (comment) {
      comment.likes += 1;
      this.comments.set(commentId, comment);
    }
  }
  
  async dislikeComment(commentId: number): Promise<void> {
    const comment = this.comments.get(commentId);
    if (comment) {
      comment.dislikes += 1;
      this.comments.set(commentId, comment);
    }
  }
  
  // Watchlist methods
  async getWatchlist(userId: number): Promise<Movie[]> {
    const userWatchlist = this.watchlists.filter(item => item.userId === userId);
    return userWatchlist.map(item => this.movies.get(item.movieSlug)!).filter(Boolean);
  }
  
  async addToWatchlist(watchlistItem: InsertWatchlist): Promise<void> {
    const exists = this.watchlists.some(
      item => item.userId === watchlistItem.userId && item.movieSlug === watchlistItem.movieSlug
    );
    
    if (!exists) {
      const id = this.currentWatchlistId++;
      const now = new Date();
      this.watchlists.push({ ...watchlistItem, id, addedAt: now });
    }
  }
  
  async removeFromWatchlist(userId: number, movieSlug: string): Promise<void> {
    this.watchlists = this.watchlists.filter(
      item => !(item.userId === userId && item.movieSlug === movieSlug)
    );
  }
  
  // Cache methods
  async cacheMovieList(data: MovieListResponse, page: number): Promise<void> {
    this.movieListCache.set(page, data);
  }
  
  async cacheMovieDetail(data: MovieDetailResponse): Promise<void> {
    this.movieDetailCache.set(data.movie.slug, data);
  }
  
  async getMovieListCache(page: number): Promise<MovieListResponse | undefined> {
    return this.movieListCache.get(page);
  }
  
  async getMovieDetailCache(slug: string): Promise<MovieDetailResponse | undefined> {
    return this.movieDetailCache.get(slug);
  }
  
  // Content Approval methods
  async submitContentForApproval(approval: InsertContentApproval): Promise<ContentApproval> {
    const id = this.currentApprovalId++;
    const now = new Date();
    
    const newApproval: ContentApproval = {
      ...approval,
      id,
      status: ContentStatus.PENDING,
      submittedAt: now,
      reviewedAt: null,
      reviewedByUserId: null
    };
    
    this.contentApprovals.set(id, newApproval);
    return newApproval;
  }
  
  async approveContent(contentId: number, reviewerId: number, comments?: string): Promise<ContentApproval | undefined> {
    const approval = this.contentApprovals.get(contentId);
    if (!approval) return undefined;
    
    const now = new Date();
    const updatedApproval: ContentApproval = {
      ...approval,
      status: ContentStatus.APPROVED,
      reviewedByUserId: reviewerId,
      reviewedAt: now,
      comments: comments || approval.comments
    };
    
    this.contentApprovals.set(contentId, updatedApproval);
    return updatedApproval;
  }
  
  async rejectContent(contentId: number, reviewerId: number, comments: string): Promise<ContentApproval | undefined> {
    const approval = this.contentApprovals.get(contentId);
    if (!approval) return undefined;
    
    const now = new Date();
    const updatedApproval: ContentApproval = {
      ...approval,
      status: ContentStatus.REJECTED,
      reviewedByUserId: reviewerId,
      reviewedAt: now,
      comments
    };
    
    this.contentApprovals.set(contentId, updatedApproval);
    return updatedApproval;
  }
  
  async getPendingContent(page: number, limit: number): Promise<{ data: ContentApproval[], total: number }> {
    const pendingApprovals = Array.from(this.contentApprovals.values())
      .filter(approval => approval.status === ContentStatus.PENDING)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    
    const total = pendingApprovals.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedApprovals = pendingApprovals.slice(start, end);
    
    return { data: paginatedApprovals, total };
  }
  
  async getContentByUser(userId: number, page: number, limit: number, status?: string): Promise<{ data: ContentApproval[], total: number }> {
    let userApprovals = Array.from(this.contentApprovals.values())
      .filter(approval => approval.submittedByUserId === userId);
    
    if (status) {
      userApprovals = userApprovals.filter(approval => approval.status === status);
    }
    
    userApprovals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    
    const total = userApprovals.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedApprovals = userApprovals.slice(start, end);
    
    return { data: paginatedApprovals, total };
  }
  
  // Audit Log methods
  async addAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = this.currentAuditLogId++;
    const now = new Date();
    
    const newLog: AuditLog = {
      ...log,
      id,
      timestamp: now
    };
    
    this.auditLogs.set(id, newLog);
    return newLog;
  }
  
  async getAuditLogs(page: number, limit: number, filters?: {activityType?: string, userId?: number}): Promise<{ data: AuditLog[], total: number }> {
    let logs = Array.from(this.auditLogs.values());
    
    if (filters) {
      if (filters.activityType) {
        logs = logs.filter(log => log.activityType === filters.activityType);
      }
      
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
    }
    
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const total = logs.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedLogs = logs.slice(start, end);
    
    return { data: paginatedLogs, total };
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
    
    // Initialize admin user if it doesn't exist
    this.initializeAdminUser();
  }
  
  private async initializeAdminUser() {
    try {
      // Check if admin user already exists
      const adminUser = await this.getUserByUsername('admin');
      
      if (!adminUser) {
        // Create admin user with super admin privileges
        const hashedPassword = await this.hashPassword('admin');
        await this.createUser({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@filmflex.com',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE
        });
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
    }
  }
  
  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      role: insertUser.role || UserRole.NORMAL,
      status: insertUser.status || UserStatus.ACTIVE
    }).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async changeUserStatus(id: number, status: string): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async getAllUsers(page: number, limit: number, filters?: {role?: string, status?: string, search?: string}): Promise<{ data: User[], total: number }> {
    let query = db.select().from(users);
    
    if (filters) {
      if (filters.role) {
        query = query.where(eq(users.role, filters.role));
      }
      
      if (filters.status) {
        query = query.where(eq(users.status, filters.status));
      }
      
      if (filters.search) {
        query = query.where(
          sql`(${users.username} ILIKE ${`%${filters.search}%`} OR ${users.email} ILIKE ${`%${filters.search}%`})`
        );
      }
    }
    
    // Count total before applying pagination
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(query.as('user_count'));
    const total = countResult[0]?.count || 0;
    
    // Apply pagination and fetch users
    const data = await query.limit(limit).offset((page - 1) * limit);
    
    return { data, total };
  }
  
  // Movie methods
  async getMovies(page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const data = await db.select().from(movies).limit(limit).offset((page - 1) * limit);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(movies);
    return { data, total: count };
  }
  
  async getMovieBySlug(slug: string): Promise<Movie | undefined> {
    const [movie] = await db.select().from(movies).where(eq(movies.slug, slug));
    return movie;
  }
  
  async saveMovie(movie: InsertMovie): Promise<Movie> {
    const [savedMovie] = await db.insert(movies).values(movie).returning();
    return savedMovie;
  }
  
  async searchMovies(query: string, page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const searchPattern = `%${query}%`;
    
    const data = await db.select().from(movies)
      .where(
        sql`(${movies.name} ILIKE ${searchPattern} OR 
        ${movies.originName} ILIKE ${searchPattern} OR 
        ${movies.description} ILIKE ${searchPattern})`
      )
      .limit(limit)
      .offset((page - 1) * limit);
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(movies)
      .where(
        sql`(${movies.name} ILIKE ${searchPattern} OR 
        ${movies.originName} ILIKE ${searchPattern} OR 
        ${movies.description} ILIKE ${searchPattern})`
      );
    
    return { data, total: count };
  }
  
  async getMoviesByCategory(categorySlug: string, page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    // This assumes categories is a JSONB array field with objects that have a slug property
    const data = await db.select().from(movies)
      .where(sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${movies.categories}) as category 
      WHERE category->>'slug' = ${categorySlug})`)
      .limit(limit)
      .offset((page - 1) * limit);
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(movies)
      .where(sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${movies.categories}) as category 
      WHERE category->>'slug' = ${categorySlug})`);
    
    return { data, total: count };
  }
  
  // Episode methods
  async getEpisodesByMovieSlug(movieSlug: string): Promise<Episode[]> {
    return db.select().from(episodes).where(eq(episodes.movieSlug, movieSlug));
  }
  
  async getEpisodeBySlug(slug: string): Promise<Episode | undefined> {
    const [episode] = await db.select().from(episodes).where(eq(episodes.slug, slug));
    return episode;
  }
  
  async saveEpisode(episode: InsertEpisode): Promise<Episode> {
    const [savedEpisode] = await db.insert(episodes).values(episode).returning();
    return savedEpisode;
  }
  
  // Comment methods
  async getCommentsByMovieSlug(movieSlug: string, page: number, limit: number): Promise<{ data: Comment[], total: number }> {
    const data = await db.select().from(comments)
      .where(eq(comments.movieSlug, movieSlug))
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(comments)
      .where(eq(comments.movieSlug, movieSlug));
    
    return { data, total: count };
  }
  
  async addComment(comment: InsertComment): Promise<Comment> {
    const [savedComment] = await db.insert(comments).values(comment).returning();
    return savedComment;
  }
  
  async likeComment(commentId: number): Promise<void> {
    await db.update(comments)
      .set({ likes: sql`${comments.likes} + 1` })
      .where(eq(comments.id, commentId));
  }
  
  async dislikeComment(commentId: number): Promise<void> {
    await db.update(comments)
      .set({ dislikes: sql`${comments.dislikes} + 1` })
      .where(eq(comments.id, commentId));
  }
  
  // Watchlist methods
  async getWatchlist(userId: number): Promise<Movie[]> {
    const result = await db.select({ movie: movies })
      .from(watchlist)
      .innerJoin(movies, eq(watchlist.movieSlug, movies.slug))
      .where(eq(watchlist.userId, userId));
    
    return result.map(item => item.movie);
  }
  
  async addToWatchlist(watchlistItem: InsertWatchlist): Promise<void> {
    // Check if already exists
    const [existing] = await db.select().from(watchlist)
      .where(and(
        eq(watchlist.userId, watchlistItem.userId),
        eq(watchlist.movieSlug, watchlistItem.movieSlug)
      ));
    
    if (!existing) {
      await db.insert(watchlist).values(watchlistItem);
    }
  }
  
  async removeFromWatchlist(userId: number, movieSlug: string): Promise<void> {
    await db.delete(watchlist)
      .where(and(
        eq(watchlist.userId, userId),
        eq(watchlist.movieSlug, movieSlug)
      ));
  }
  
  // Content Approval methods
  async submitContentForApproval(approval: InsertContentApproval): Promise<ContentApproval> {
    const [savedApproval] = await db.insert(contentApprovals)
      .values({
        ...approval,
        status: ContentStatus.PENDING
      })
      .returning();
    
    return savedApproval;
  }
  
  async approveContent(contentId: number, reviewerId: number, comments?: string): Promise<ContentApproval | undefined> {
    const [approval] = await db.update(contentApprovals)
      .set({
        status: ContentStatus.APPROVED,
        reviewedByUserId: reviewerId,
        reviewedAt: new Date(),
        comments: comments || sql`${contentApprovals.comments}`
      })
      .where(eq(contentApprovals.id, contentId))
      .returning();
    
    return approval;
  }
  
  async rejectContent(contentId: number, reviewerId: number, comments: string): Promise<ContentApproval | undefined> {
    const [approval] = await db.update(contentApprovals)
      .set({
        status: ContentStatus.REJECTED,
        reviewedByUserId: reviewerId,
        reviewedAt: new Date(),
        comments
      })
      .where(eq(contentApprovals.id, contentId))
      .returning();
    
    return approval;
  }
  
  async getPendingContent(page: number, limit: number): Promise<{ data: ContentApproval[], total: number }> {
    const data = await db.select().from(contentApprovals)
      .where(eq(contentApprovals.status, ContentStatus.PENDING))
      .orderBy(desc(contentApprovals.submittedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(contentApprovals)
      .where(eq(contentApprovals.status, ContentStatus.PENDING));
    
    return { data, total: count };
  }
  
  async getContentByUser(userId: number, page: number, limit: number, status?: string): Promise<{ data: ContentApproval[], total: number }> {
    let query = db.select().from(contentApprovals)
      .where(eq(contentApprovals.submittedByUserId, userId));
    
    if (status) {
      query = query.where(eq(contentApprovals.status, status));
    }
    
    const data = await query
      .orderBy(desc(contentApprovals.submittedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(contentApprovals)
      .where(eq(contentApprovals.submittedByUserId, userId));
    
    if (status) {
      countQuery = countQuery.where(eq(contentApprovals.status, status));
    }
    
    const [{ count }] = await countQuery;
    
    return { data, total: count };
  }
  
  // Audit Log methods
  async addAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [savedLog] = await db.insert(auditLogs).values(log).returning();
    return savedLog;
  }
  
  async getAuditLogs(page: number, limit: number, filters?: {activityType?: string, userId?: number}): Promise<{ data: AuditLog[], total: number }> {
    let query = db.select().from(auditLogs);
    
    if (filters) {
      if (filters.activityType) {
        query = query.where(eq(auditLogs.activityType, filters.activityType));
      }
      
      if (filters.userId) {
        query = query.where(eq(auditLogs.userId, filters.userId));
      }
    }
    
    const data = await query
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset((page - 1) * limit);
    
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    
    if (filters) {
      if (filters.activityType) {
        countQuery = countQuery.where(eq(auditLogs.activityType, filters.activityType));
      }
      
      if (filters.userId) {
        countQuery = countQuery.where(eq(auditLogs.userId, filters.userId));
      }
    }
    
    const [{ count }] = await countQuery;
    
    return { data, total: count };
  }
  
  // Cache methods
  // For database implementation, we'll still cache in memory for now
  // In a production environment, we might want to use Redis or another caching solution
  private movieListCache = new Map<number, MovieListResponse>();
  private movieDetailCache = new Map<string, MovieDetailResponse>();
  
  async cacheMovieList(data: MovieListResponse, page: number): Promise<void> {
    this.movieListCache.set(page, data);
  }
  
  async cacheMovieDetail(data: MovieDetailResponse): Promise<void> {
    this.movieDetailCache.set(data.movie.slug, data);
  }
  
  async getMovieListCache(page: number): Promise<MovieListResponse | undefined> {
    return this.movieListCache.get(page);
  }
  
  async getMovieDetailCache(slug: string): Promise<MovieDetailResponse | undefined> {
    return this.movieDetailCache.get(slug);
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
