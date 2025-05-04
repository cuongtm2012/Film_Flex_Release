import { 
  User, InsertUser, 
  Movie, InsertMovie, 
  Episode, InsertEpisode, 
  Comment, InsertComment, 
  Watchlist, InsertWatchlist,
  ContentApproval, InsertContentApproval,
  AuditLog, InsertAuditLog,
  Role, InsertRole,
  Permission, InsertPermission,
  RolePermission, InsertRolePermission,
  MovieListResponse, MovieDetailResponse,
  users, movies, episodes, comments, watchlist, contentApprovals, auditLogs,
  roles, permissions, rolePermissions,
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
  
  // Role methods
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, roleData: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<void>;
  
  // Permission methods
  getPermission(id: number): Promise<Permission | undefined>;
  getPermissionByName(name: string): Promise<Permission | undefined>;
  getAllPermissions(): Promise<Permission[]>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: number, permissionData: Partial<InsertPermission>): Promise<Permission | undefined>;
  deletePermission(id: number): Promise<void>;
  
  // Role-Permission methods
  assignPermissionToRole(roleId: number, permissionId: number): Promise<RolePermission>;
  removePermissionFromRole(roleId: number, permissionId: number): Promise<void>;
  getPermissionsByRole(roleId: number): Promise<Permission[]>;
  getRolesByPermission(permissionId: number): Promise<Role[]>;
  
  // Movie methods
  getMovies(page: number, limit: number): Promise<{ data: Movie[], total: number }>;
  getMovieBySlug(slug: string): Promise<Movie | undefined>;
  getMovieByMovieId(movieId: string): Promise<Movie | undefined>;
  saveMovie(movie: InsertMovie): Promise<Movie>;
  searchMovies(query: string, normalizedQuery: string, page: number, limit: number): Promise<{ data: Movie[], total: number }>;
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
  checkWatchlist(userId: number, movieSlug: string): Promise<boolean>;
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
  cacheMovieCategory(data: MovieListResponse, categorySlug: string, page: number): Promise<void>;
  getMovieListCache(page: number): Promise<MovieListResponse | null>;
  getMovieDetailCache(slug: string): Promise<MovieDetailResponse | null>;
  getMovieCategoryCache(categorySlug: string, page: number): Promise<MovieListResponse | null>;
  
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
  private roles: Map<number, Role>;
  private permissions: Map<number, Permission>;
  private rolePermissions: Map<string, RolePermission>; // Key is roleId-permissionId
  
  sessionStore: session.Store;
  
  private currentUserId: number = 1;
  private currentMovieId: number = 1;
  private currentEpisodeId: number = 1;
  private currentCommentId: number = 1;
  private currentWatchlistId: number = 1;
  private currentApprovalId: number = 1;
  private currentAuditLogId: number = 1;
  private currentRoleId: number = 1;
  private currentPermissionId: number = 1;

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
    this.roles = new Map();
    this.permissions = new Map();
    this.rolePermissions = new Map();
    
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
  
  async getMovieByMovieId(movieId: string): Promise<Movie | undefined> {
    return Array.from(this.movies.values()).find(movie => movie.movieId === movieId);
  }
  
  async saveMovie(movie: InsertMovie): Promise<Movie> {
    const id = this.currentMovieId++;
    const newMovie: Movie = { ...movie, id, modifiedAt: new Date() };
    this.movies.set(newMovie.slug, newMovie);
    return newMovie;
  }
  
  /**
   * Function to normalize Vietnamese text by removing accents and diacritics
   * This helps with search functionality where users might type without accents
   */
  private normalizeText(text: string): string {
    if (!text) return '';
    
    // Normalize to NFD form where accented chars are separated into base char + accent
    return text.normalize('NFD')
      // Remove combining diacritical marks (accents, etc.)
      .replace(/[\u0300-\u036f]/g, '')
      // Remove other special characters and normalize to lowercase
      .toLowerCase()
      // Replace đ/Đ with d
      .replace(/[đĐ]/g, 'd');
  }
  
  async searchMovies(query: string, normalizedQuery: string, page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const lowerQuery = query.toLowerCase();
    const lowerNormalizedQuery = normalizedQuery.toLowerCase();
    
    // First get all matching movies
    const matchingMovies = Array.from(this.movies.values()).filter(
      (movie) => {
        // Check with original query
        const nameMatch = movie.name.toLowerCase().includes(lowerQuery);
        const originNameMatch = movie.originName && movie.originName.toLowerCase().includes(lowerQuery);
        const descriptionMatch = movie.description && movie.description.toLowerCase().includes(lowerQuery);
        
        // Also check with normalized query, comparing against normalized versions of movie fields
        const normalizedName = this.normalizeText(movie.name);
        const normalizedOriginName = movie.originName ? this.normalizeText(movie.originName) : '';
        const normalizedDescription = movie.description ? this.normalizeText(movie.description) : '';
        
        const normalizedNameMatch = normalizedName.includes(lowerNormalizedQuery);
        const normalizedOriginNameMatch = normalizedOriginName.includes(lowerNormalizedQuery);
        const normalizedDescriptionMatch = normalizedDescription.includes(lowerNormalizedQuery);
        
        // Also check if slug contains the normalized query
        const slugMatch = movie.slug.includes(lowerNormalizedQuery);
        
        return nameMatch || originNameMatch || descriptionMatch || 
               normalizedNameMatch || normalizedOriginNameMatch || normalizedDescriptionMatch || 
               slugMatch;
      }
    );
    
    // Now sort the matching movies based on relevance
    const sortedMovies = matchingMovies.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aNormalizedName = this.normalizeText(a.name).toLowerCase();
      const bNormalizedName = this.normalizeText(b.name).toLowerCase();
      
      // Exact match gets highest priority
      const aExactMatch = aName === lowerQuery || (a.originName && a.originName.toLowerCase() === lowerQuery);
      const bExactMatch = bName === lowerQuery || (b.originName && b.originName.toLowerCase() === lowerQuery);
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Exact match with normalized text gets next priority
      const aNormalizedExactMatch = aNormalizedName === lowerNormalizedQuery;
      const bNormalizedExactMatch = bNormalizedName === lowerNormalizedQuery;
      if (aNormalizedExactMatch && !bNormalizedExactMatch) return -1;
      if (!aNormalizedExactMatch && bNormalizedExactMatch) return 1;
      
      // Starts with gets next priority
      const aStartsWith = aName.startsWith(lowerQuery) || (a.originName && a.originName.toLowerCase().startsWith(lowerQuery));
      const bStartsWith = bName.startsWith(lowerQuery) || (b.originName && b.originName.toLowerCase().startsWith(lowerQuery));
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Normalized starts with gets next priority
      const aNormalizedStartsWith = aNormalizedName.startsWith(lowerNormalizedQuery);
      const bNormalizedStartsWith = bNormalizedName.startsWith(lowerNormalizedQuery);
      if (aNormalizedStartsWith && !bNormalizedStartsWith) return -1;
      if (!aNormalizedStartsWith && bNormalizedStartsWith) return 1;
      
      // Title word boundary match gets next priority (e.g., "Tình yêu" in "Câu chuyện tình yêu")
      const aWordMatch = ` ${aName} `.includes(` ${lowerQuery} `);
      const bWordMatch = ` ${bName} `.includes(` ${lowerQuery} `);
      if (aWordMatch && !bWordMatch) return -1;
      if (!aWordMatch && bWordMatch) return 1;
      
      // Finally, fall back to alphabetical sort
      return aName.localeCompare(bName);
    });
    
    const total = sortedMovies.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedMovies = sortedMovies.slice(start, end);
    
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
  
  async checkWatchlist(userId: number, movieSlug: string): Promise<boolean> {
    return this.watchlists.some(
      item => item.userId === userId && item.movieSlug === movieSlug
    );
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
  private movieCategoryCache = new Map<string, MovieListResponse>();
  private readonly API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  async cacheMovieList(data: MovieListResponse, page: number): Promise<void> {
    this.movieListCache.set(page, data);
  }
  
  async cacheMovieDetail(data: MovieDetailResponse): Promise<void> {
    this.movieDetailCache.set(data.movie.slug, data);
  }
  
  async cacheMovieCategory(data: MovieListResponse, categorySlug: string, page: number): Promise<void> {
    const key = `${categorySlug}_${page}`;
    this.movieCategoryCache.set(key, data);
  }
  
  async getMovieListCache(page: number): Promise<MovieListResponse | null> {
    const cached = this.movieListCache.get(page);
    return cached || null;
  }
  
  async getMovieDetailCache(slug: string): Promise<MovieDetailResponse | null> {
    const cached = this.movieDetailCache.get(slug);
    return cached || null;
  }
  
  async getMovieCategoryCache(categorySlug: string, page: number): Promise<MovieListResponse | null> {
    const key = `${categorySlug}_${page}`;
    const cached = this.movieCategoryCache.get(key);
    return cached || null;
  }
  
  // Role methods
  async getRole(id: number): Promise<Role | undefined> {
    return this.roles.get(id);
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    return Array.from(this.roles.values()).find(role => role.name === name);
  }

  async getAllRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async createRole(role: InsertRole): Promise<Role> {
    const id = this.currentRoleId++;
    const now = new Date();
    
    const newRole: Role = {
      ...role,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.roles.set(id, newRole);
    return newRole;
  }

  async updateRole(id: number, roleData: Partial<InsertRole>): Promise<Role | undefined> {
    const role = this.roles.get(id);
    if (!role) return undefined;
    
    const updatedRole: Role = {
      ...role,
      ...roleData,
      updatedAt: new Date()
    };
    
    this.roles.set(id, updatedRole);
    return updatedRole;
  }

  async deleteRole(id: number): Promise<void> {
    this.roles.delete(id);
    
    // Also delete any role-permission relations
    for (const key of this.rolePermissions.keys()) {
      if (key.startsWith(`${id}-`)) {
        this.rolePermissions.delete(key);
      }
    }
  }

  // Permission methods
  async getPermission(id: number): Promise<Permission | undefined> {
    return this.permissions.get(id);
  }

  async getPermissionByName(name: string): Promise<Permission | undefined> {
    return Array.from(this.permissions.values()).find(permission => permission.name === name);
  }

  async getAllPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const id = this.currentPermissionId++;
    const now = new Date();
    
    const newPermission: Permission = {
      ...permission,
      id,
      createdAt: now
    };
    
    this.permissions.set(id, newPermission);
    return newPermission;
  }

  async updatePermission(id: number, permissionData: Partial<InsertPermission>): Promise<Permission | undefined> {
    const permission = this.permissions.get(id);
    if (!permission) return undefined;
    
    const updatedPermission: Permission = {
      ...permission,
      ...permissionData
    };
    
    this.permissions.set(id, updatedPermission);
    return updatedPermission;
  }

  async deletePermission(id: number): Promise<void> {
    this.permissions.delete(id);
    
    // Also delete any role-permission relations
    for (const key of this.rolePermissions.keys()) {
      if (key.endsWith(`-${id}`)) {
        this.rolePermissions.delete(key);
      }
    }
  }

  // Role-Permission methods
  async assignPermissionToRole(roleId: number, permissionId: number): Promise<RolePermission> {
    const key = `${roleId}-${permissionId}`;
    const rolePermission: RolePermission = { roleId, permissionId, id: key };
    
    this.rolePermissions.set(key, rolePermission);
    return rolePermission;
  }

  async removePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    const key = `${roleId}-${permissionId}`;
    this.rolePermissions.delete(key);
  }

  async getPermissionsByRole(roleId: number): Promise<Permission[]> {
    const permissionIds = Array.from(this.rolePermissions.values())
      .filter(rp => rp.roleId === roleId)
      .map(rp => rp.permissionId);
    
    return permissionIds.map(id => this.permissions.get(id)).filter(Boolean) as Permission[];
  }

  async getRolesByPermission(permissionId: number): Promise<Role[]> {
    const roleIds = Array.from(this.rolePermissions.values())
      .filter(rp => rp.permissionId === permissionId)
      .map(rp => rp.roleId);
    
    return roleIds.map(id => this.roles.get(id)).filter(Boolean) as Role[];
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
        const hashedPassword = await this.hashPassword('Cuongtm2012$');
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
  
  async getMovieByMovieId(movieId: string): Promise<Movie | undefined> {
    const [movie] = await db.select().from(movies).where(eq(movies.movieId, movieId));
    return movie;
  }
  
  async saveMovie(movie: InsertMovie): Promise<Movie> {
    const [savedMovie] = await db.insert(movies).values(movie).returning();
    return savedMovie;
  }
  
  /**
   * Search for movies using both original query and normalized query (without accents)
   * @param query The original search query
   * @param normalizedQuery The search query with accents removed (e.g., "co dau" for "cô dâu")
   * @param page The page number
   * @param limit The number of results per page
   */
  async searchMovies(query: string, normalizedQuery: string, page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const exactPattern = query.toLowerCase();
    const normalizedExactPattern = normalizedQuery.toLowerCase();
    const startWithPattern = `${query}%`;
    const normalizedStartWithPattern = `${normalizedQuery}%`;
    const searchPattern = `%${query}%`;
    const normalizedPattern = `%${normalizedQuery}%`;
    
    // The SQL function unaccent() is used to remove accents for comparison
    // We need to install the unaccent extension if it's not already available
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent`);
    } catch (error) {
      console.error("Error creating unaccent extension:", error);
      // Continue without unaccent if it fails - we'll rely on direct pattern matching
    }
    
    try {
      // Get all matching items first, then we'll apply custom sorting
      const allMatches = await db.select().from(movies)
        .where(
          sql`(
            ${movies.name} ILIKE ${searchPattern} OR 
            ${movies.originName} ILIKE ${searchPattern} OR 
            ${movies.description} ILIKE ${searchPattern} OR
            unaccent(${movies.name}) ILIKE ${normalizedPattern} OR
            unaccent(${movies.originName}) ILIKE ${normalizedPattern} OR
            unaccent(${movies.description}) ILIKE ${normalizedPattern} OR
            ${movies.slug} ILIKE ${normalizedPattern}
          )`
        );
      
      // Sort the results based on relevance
      const sortedResults = allMatches.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aOriginName = a.originName?.toLowerCase() || '';
        const bOriginName = b.originName?.toLowerCase() || '';
        
        // Exact match gets highest priority
        const aExactMatch = aName === exactPattern || aOriginName === exactPattern;
        const bExactMatch = bName === exactPattern || bOriginName === exactPattern;
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        // Normalized exact match gets next priority
        const aNormalizedName = this.normalizeText(a.name).toLowerCase();
        const bNormalizedName = this.normalizeText(b.name).toLowerCase();
        const aNormalizedOriginName = a.originName ? this.normalizeText(a.originName).toLowerCase() : '';
        const bNormalizedOriginName = b.originName ? this.normalizeText(b.originName).toLowerCase() : '';
        
        const aNormalizedExactMatch = aNormalizedName === normalizedExactPattern || aNormalizedOriginName === normalizedExactPattern;
        const bNormalizedExactMatch = bNormalizedName === normalizedExactPattern || bNormalizedOriginName === normalizedExactPattern;
        if (aNormalizedExactMatch && !bNormalizedExactMatch) return -1;
        if (!aNormalizedExactMatch && bNormalizedExactMatch) return 1;
        
        // Starts with gets next priority
        const aStartsWith = aName.startsWith(exactPattern) || aOriginName.startsWith(exactPattern);
        const bStartsWith = bName.startsWith(exactPattern) || bOriginName.startsWith(exactPattern);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Normalized starts with gets next priority
        const aNormalizedStartsWith = aNormalizedName.startsWith(normalizedExactPattern) || aNormalizedOriginName.startsWith(normalizedExactPattern);
        const bNormalizedStartsWith = bNormalizedName.startsWith(normalizedExactPattern) || bNormalizedOriginName.startsWith(normalizedExactPattern);
        if (aNormalizedStartsWith && !bNormalizedStartsWith) return -1;
        if (!aNormalizedStartsWith && bNormalizedStartsWith) return 1;
        
        // Title word boundary match gets next priority (e.g., "Tình yêu" in "Câu chuyện tình yêu")
        const aWordMatch = ` ${aName} `.includes(` ${exactPattern} `) || ` ${aOriginName} `.includes(` ${exactPattern} `);
        const bWordMatch = ` ${bName} `.includes(` ${exactPattern} `) || ` ${bOriginName} `.includes(` ${exactPattern} `);
        if (aWordMatch && !bWordMatch) return -1;
        if (!aWordMatch && bWordMatch) return 1;
        
        // Finally, fall back to alphabetical sort
        return aName.localeCompare(bName);
      });
      
      // Apply pagination to the sorted results
      const total = sortedResults.length;
      const start = (page - 1) * limit;
      const end = Math.min(start + limit, total);
      const data = sortedResults.slice(start, end);
      
      return { data, total };
    } catch (error) {
      // If unaccent fails or isn't available, fall back to simpler matching
      console.error("Error with advanced search, falling back to basic search:", error);
      
      // For fallback, we'll just do a simple DB query with limit/offset
      const data = await db.select().from(movies)
        .where(
          sql`(
            ${movies.name} ILIKE ${searchPattern} OR 
            ${movies.originName} ILIKE ${searchPattern} OR 
            ${movies.description} ILIKE ${searchPattern} OR
            ${movies.slug} ILIKE ${normalizedPattern}
          )`
        )
        .limit(limit)
        .offset((page - 1) * limit);
      
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(movies)
        .where(
          sql`(
            ${movies.name} ILIKE ${searchPattern} OR 
            ${movies.originName} ILIKE ${searchPattern} OR 
            ${movies.description} ILIKE ${searchPattern} OR
            ${movies.slug} ILIKE ${normalizedPattern}
          )`
        );
      
      return { data, total: count };
    }
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
  async getCommentsByMovieSlug(movieSlug: string, page: number, limit: number): Promise<{ data: any[], total: number }> {
    // Join comments with users to get the username
    const data = await db.select({
      comment: comments,
      username: users.username
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.movieSlug, movieSlug))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
    
    // Format the results
    const formattedData = data.map(item => ({
      ...item.comment,
      username: item.username
    }));
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(comments)
      .where(eq(comments.movieSlug, movieSlug));
    
    return { data: formattedData, total: count };
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
  
  async checkWatchlist(userId: number, movieSlug: string): Promise<boolean> {
    const [existing] = await db.select().from(watchlist)
      .where(and(
        eq(watchlist.userId, userId),
        eq(watchlist.movieSlug, movieSlug)
      ));
    
    return Boolean(existing);
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
  private movieListCache = new Map<number, {data: MovieListResponse, timestamp: number}>();
  private movieDetailCache = new Map<string, {data: MovieDetailResponse, timestamp: number}>();
  private movieCategoryCache = new Map<string, {data: MovieListResponse, timestamp: number}>();
  
  private readonly API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  async cacheMovieList(data: MovieListResponse, page: number): Promise<void> {
    this.movieListCache.set(page, {data, timestamp: Date.now()});
  }
  
  async cacheMovieDetail(data: MovieDetailResponse): Promise<void> {
    this.movieDetailCache.set(data.movie.slug, {data, timestamp: Date.now()});
  }
  
  async cacheMovieCategory(data: MovieListResponse, categorySlug: string, page: number): Promise<void> {
    const key = `${categorySlug}_${page}`;
    this.movieCategoryCache.set(key, {data, timestamp: Date.now()});
  }
  
  async getMovieListCache(page: number): Promise<MovieListResponse | null> {
    const cached = this.movieListCache.get(page);
    if (cached && (Date.now() - cached.timestamp) < this.API_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }
  
  async getMovieDetailCache(slug: string): Promise<MovieDetailResponse | null> {
    const cached = this.movieDetailCache.get(slug);
    if (cached && (Date.now() - cached.timestamp) < this.API_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }
  
  async getMovieCategoryCache(categorySlug: string, page: number): Promise<MovieListResponse | null> {
    const key = `${categorySlug}_${page}`;
    const cached = this.movieCategoryCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.API_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  // Role methods
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role;
  }

  async getAllRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: number, roleData: Partial<InsertRole>): Promise<Role | undefined> {
    const [updatedRole] = await db.update(roles)
      .set({
        ...roleData,
        updatedAt: new Date()
      })
      .where(eq(roles.id, id))
      .returning();
    return updatedRole;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // Permission methods
  async getPermission(id: number): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
    return permission;
  }

  async getPermissionByName(name: string): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.name, name));
    return permission;
  }

  async getAllPermissions(): Promise<Permission[]> {
    return db.select().from(permissions);
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [newPermission] = await db.insert(permissions).values(permission).returning();
    return newPermission;
  }

  async updatePermission(id: number, permissionData: Partial<InsertPermission>): Promise<Permission | undefined> {
    const [updatedPermission] = await db.update(permissions)
      .set(permissionData)
      .where(eq(permissions.id, id))
      .returning();
    return updatedPermission;
  }

  async deletePermission(id: number): Promise<void> {
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  // Role-Permission methods
  async assignPermissionToRole(roleId: number, permissionId: number): Promise<RolePermission> {
    const [rolePermission] = await db.insert(rolePermissions)
      .values({
        roleId,
        permissionId
      })
      .returning();
    return rolePermission;
  }

  async removePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    await db.delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permissionId, permissionId)
        )
      );
  }

  async getPermissionsByRole(roleId: number): Promise<Permission[]> {
    const result = await db.select({
      permission: permissions
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
    
    return result.map(r => r.permission);
  }

  async getRolesByPermission(permissionId: number): Promise<Role[]> {
    const result = await db.select({
      role: roles
    })
    .from(rolePermissions)
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .where(eq(rolePermissions.permissionId, permissionId));
    
    return result.map(r => r.role);
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
