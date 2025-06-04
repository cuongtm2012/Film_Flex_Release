import { 
  Movie, InsertMovie, 
  Episode, InsertEpisode, 
  Comment, InsertComment, 
  InsertWatchlist,
  ViewHistory,
  ContentApproval, InsertContentApproval,
  AuditLog, InsertAuditLog,
  Role, InsertRole,
  Permission, InsertPermission,
  RolePermission,
  MovieListResponse,
  MovieDetailResponse,
  users, movies, episodes, comments, watchlist, viewHistory, contentApprovals, auditLogs,
  roles, permissions, rolePermissions, userCommentReactions,
  UserRole, UserStatus, ContentStatus,
  User, InsertUser, UserCommentReaction, InsertUserCommentReaction
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  getRolesByPermission(permissionId: number): Promise<Role[]>;  // Movie methods
  getMovies(page: number, limit: number, sortBy?: string, filters?: {isRecommended?: boolean, type?: string, section?: string}): Promise<{ data: Movie[], total: number }>;
  getMovieBySlug(slug: string): Promise<Movie | undefined>;
  getMovieByMovieId(movieId: string): Promise<Movie | undefined>;
  saveMovie(movie: InsertMovie): Promise<Movie>;
  updateMovieSection(movieId: string, section: string): Promise<Movie | undefined>;
  searchMovies(query: string, normalizedQuery: string, page: number, limit: number, filters?: {section?: string, isRecommended?: boolean, type?: string}): Promise<{ data: Movie[], total: number }>;
  getMoviesByCategory(categorySlug: string, page: number, limit: number, sortBy?: string): Promise<{ data: Movie[], total: number }>;
  getMoviesBySection(section: string, page: number, limit: number): Promise<{ data: Movie[], total: number }>;
  updateMovieBySlug(slug: string, updateData: Partial<Movie>): Promise<Movie | undefined>;
  
  // Episode methods
  getEpisodesByMovieSlug(movieSlug: string): Promise<Episode[]>;
  getEpisodeBySlug(slug: string): Promise<Episode | undefined>;
  saveEpisode(episode: InsertEpisode): Promise<Episode>;
  
  // Comment methods
  getCommentsByMovieSlug(movieSlug: string, page: number, limit: number, userId?: number): Promise<{ data: Comment[], total: number }>;
  addComment(comment: InsertComment): Promise<Comment>;
  likeComment(commentId: number, userId: number): Promise<void>;
  dislikeComment(commentId: number, userId: number): Promise<void>;
  getUserReactionForComment(userId: number, commentId: number): Promise<UserCommentReaction | undefined>;
  removeUserReactionForComment(userId: number, commentId: number): Promise<void>;
  
  // Watchlist methods
  getWatchlist(userId: number): Promise<Movie[]>;
  checkWatchlist(userId: number, movieSlug: string): Promise<boolean>;
  addToWatchlist(watchlistItem: InsertWatchlist): Promise<void>;
  removeFromWatchlist(userId: number, movieSlug: string): Promise<void>;
  
  // View History methods
  getViewHistory(userId: number, limit?: number): Promise<Movie[]>;
  addToViewHistory(userId: number, movieSlug: string, progress?: number): Promise<void>;
  updateViewProgress(userId: number, movieSlug: string, progress: number): Promise<void>;
  getViewedMovie(userId: number, movieSlug: string): Promise<ViewHistory | undefined>;
  
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

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PgSession = connectPg(session);
    this.sessionStore = new PgSession({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      errorLog: (error: Error) => {
        console.error('Session store error:', error);
      }
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
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
    // Build conditions array
    const conditions = [];
    if (filters?.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters?.status) {
      conditions.push(eq(users.status, filters.status));
    }
    if (filters?.search) {
      conditions.push(
        sql`(${users.username} ILIKE ${`%${filters.search}%`} OR ${users.email} ILIKE ${`%${filters.search}%`})`
      );
    }

    // Base query with all conditions
    const query = db.select()
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset((page - 1) * limit);

    // Count query
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const data = await query;
    const total = countResult[0]?.count || 0;

    return { data, total };
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
    const [newRole] = await db.insert(roles).values({
      ...role,
      description: role.description || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newRole;
  }

  async updateRole(id: number, roleData: Partial<InsertRole>): Promise<Role | undefined> {
    const [updatedRole] = await db.update(roles)
      .set({
        ...roleData,
        description: roleData.description || null,
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
    const [newPermission] = await db.insert(permissions).values({
      ...permission,
      description: permission.description || null,
      createdAt: new Date()
    }).returning();
    return newPermission;
  }

  async updatePermission(id: number, permissionData: Partial<InsertPermission>): Promise<Permission | undefined> {
    const [updatedPermission] = await db.update(permissions)
      .set({
        ...permissionData,
        description: permissionData.description || null
      })
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
      .values({ roleId, permissionId })
      .returning();
    return rolePermission;
  }

  async removePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    await db.delete(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      ));
  }

  async getPermissionsByRole(roleId: number): Promise<Permission[]> {
    const result = await db.select({ permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    
    return result.map(r => r.permission);
  }

  async getRolesByPermission(permissionId: number): Promise<Role[]> {
    const result = await db.select({ role: roles })
      .from(rolePermissions)
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .where(eq(rolePermissions.permissionId, permissionId));
    
    return result.map(r => r.role);
  }
  // Movie methods
  async getMovies(page: number, limit: number, sortBy: string = 'latest', filters?: {isRecommended?: boolean, type?: string, section?: string}): Promise<{ data: Movie[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    let filterConditions = sql`TRUE`;
    
    if (filters?.isRecommended !== undefined) {
      filterConditions = sql`${filterConditions} AND ${movies.isRecommended} = ${filters.isRecommended}`;
      console.log(`[DEBUG] Adding isRecommended filter: ${filters.isRecommended}`);
    }
    
    if (filters?.type) {
      filterConditions = sql`${filterConditions} AND ${movies.type} = ${filters.type}`;
      console.log(`[DEBUG] Adding type filter: ${filters.type}`);
    }
    
    if (filters?.section) {
      filterConditions = sql`${filterConditions} AND ${movies.section} = ${filters.section}`;
      console.log(`[DEBUG] Adding section filter: ${filters.section}`);
    }
    
    // For the year sorting case, we need to get all movies and sort manually
    if (sortBy === 'year') {
      const allMovies = await db.select().from(movies).where(filterConditions);
      const currentYear = new Date().getFullYear();
      
      const sortedMovies = allMovies.sort((a: Movie, b: Movie) => {
        const yearA = typeof a.year === 'number' && a.year > 1900 && a.year <= currentYear ? a.year : 0;
        const yearB = typeof b.year === 'number' && b.year > 1900 && b.year <= currentYear ? b.year : 0;
        
        if (yearA === 0 && yearB !== 0) return 1;
        if (yearB === 0 && yearA !== 0) return -1;
        
        return yearB - yearA;
      });
      
      const total = sortedMovies.length;
      const paginatedMovies = sortedMovies.slice(offset, offset + limit);
      
      return { data: paginatedMovies, total };
    }

    // For all other sorting options
    const baseQuery = db.select().from(movies).where(filterConditions);
    const sortedQuery = (() => {
      switch (sortBy) {
        case 'latest':
          return baseQuery.orderBy(desc(movies.modifiedAt));
        case 'popular':
        case 'rating': // Fall back to popularity for now
          return baseQuery.orderBy(desc(movies.view));
        default:
          return baseQuery.orderBy(desc(movies.modifiedAt));
      }
    })();

    const paginatedQuery = sortedQuery.limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(movies).where(filterConditions);
    const data = await paginatedQuery;
    
    return { 
      data, 
      total: count || 0 
    };
  }
  
  async getMovieBySlug(slug: string): Promise<Movie | undefined> {
    const [movie] = await db.select()
      .from(movies)
      .where(eq(movies.slug, slug));
    return movie;
  }
  
  async getMovieByMovieId(movieId: string): Promise<Movie | undefined> {
    const [movie] = await db.select()
      .from(movies)
      .where(eq(movies.movieId, movieId));
    return movie;
  }
  
  async saveMovie(movie: InsertMovie): Promise<Movie> {
    const [newMovie] = await db.insert(movies).values({
      movieId: movie.movieId,
      slug: movie.slug,
      name: movie.name,
      originName: movie.originName || null,
      posterUrl: movie.posterUrl || null,
      thumbUrl: movie.thumbUrl || null,
      year: movie.year || null,
      type: movie.type || null,
      quality: movie.quality || null,
      lang: movie.lang || null,
      time: movie.time || null,
      view: movie.view || 0,
      description: movie.description || null,
      status: movie.status || null,
      trailerUrl: movie.trailerUrl || null,      section: movie.section || null,
      isRecommended: movie.isRecommended || false,
      categories: movie.categories || [],
      countries: movie.countries || [],
      actors: movie.actors || null,
      directors: movie.directors || null
    }).returning();

    return newMovie;
  }
  
  async updateMovieSection(movieId: string, section: string): Promise<Movie | undefined> {
    const [updatedMovie] = await db.update(movies)
      .set({ section })
      .where(eq(movies.movieId, movieId))
      .returning();
    return updatedMovie;
  }
  
  async updateMovieBySlug(slug: string, updateData: Partial<Movie>): Promise<Movie | undefined> {
    // Create a clean object for database updates
    const dbUpdateData: Partial<typeof movies.$inferInsert> = {};

    // Handle section field with validation
    if ('section' in updateData) {
      const validSections = ['trending_now', 'latest_movies', 'top_rated', 'popular_tv', 'anime', null];
      dbUpdateData.section = validSections.includes(updateData.section as string) 
        ? updateData.section as string
        : null;
      console.log(`[DEBUG] Setting section to: ${dbUpdateData.section}`);
    }

    // Handle isRecommended as boolean
    if ('isRecommended' in updateData) {
      dbUpdateData.isRecommended = Boolean(updateData.isRecommended);
      console.log(`[DEBUG] Setting isRecommended to: ${dbUpdateData.isRecommended}`);
    }

    // Handle standard fields
    if ('name' in updateData) dbUpdateData.name = updateData.name;
    if ('originName' in updateData) dbUpdateData.originName = updateData.originName;
    if ('description' in updateData) dbUpdateData.description = updateData.description;
    if ('type' in updateData) dbUpdateData.type = updateData.type;
    if ('status' in updateData) dbUpdateData.status = updateData.status;
    if ('thumbUrl' in updateData) dbUpdateData.thumbUrl = updateData.thumbUrl;
    if ('posterUrl' in updateData) dbUpdateData.posterUrl = updateData.posterUrl;
    if ('trailerUrl' in updateData) dbUpdateData.trailerUrl = updateData.trailerUrl;
    if ('time' in updateData) dbUpdateData.time = updateData.time;
    if ('quality' in updateData) dbUpdateData.quality = updateData.quality;
    if ('lang' in updateData) dbUpdateData.lang = updateData.lang;
    if ('view' in updateData) dbUpdateData.view = updateData.view;
    if ('year' in updateData) {
      const yearValue = typeof updateData.year === 'string' && updateData.year === '' ? null : Number(updateData.year);
      dbUpdateData.year = (yearValue !== null && !isNaN(yearValue)) ? yearValue : null;
    }

    // Handle arrays with type safety
    if ('categories' in updateData && Array.isArray(updateData.categories)) {
      dbUpdateData.categories = updateData.categories;
    }
    if ('countries' in updateData && Array.isArray(updateData.countries)) {
      dbUpdateData.countries = updateData.countries;
    }
    if ('category' in updateData && Array.isArray(updateData.category)) {
      dbUpdateData.categories = updateData.category;
    }
    if ('country' in updateData && Array.isArray(updateData.country)) {
      dbUpdateData.countries = updateData.country;
    }

    // Handle episode fields
    if ('episodeCurrent' in updateData) dbUpdateData.episodeCurrent = updateData.episodeCurrent;
    if ('episodeTotal' in updateData) dbUpdateData.episodeTotal = updateData.episodeTotal;

    // Update modification timestamp
    dbUpdateData.modifiedAt = new Date();

    console.log(`[DEBUG] Updating movie ${slug} with data:`, dbUpdateData);

    try {
      const [updatedMovie] = await db.update(movies)
        .set(dbUpdateData)
        .where(eq(movies.slug, slug))
        .returning();

      // Clear cache
      if (this.clearMovieDetailCache) {
        await this.clearMovieDetailCache(slug);
      }

      return updatedMovie;
    } catch (error) {
      console.error('Error updating movie:', { slug, error });
      throw error;
    }
  }
  
  // Episode methods
  async getEpisodesByMovieSlug(movieSlug: string): Promise<Episode[]> {
    const episodesList = await db.select()
      .from(episodes)
      .where(eq(episodes.movieSlug, movieSlug));
    
    // Sort episodes by extracting episode numbers from the name
    return episodesList.sort((a, b) => {
      // Extract episode numbers from episode names
      const getEpisodeNumber = (name: string): number => {
        // Look for patterns like "Episode 1", "Ep 1", "Tập 1", etc.
        const match = name.match(/(?:episode|ep|tập|tap)\s*(\d+)/i);
        if (match) {
          return parseInt(match[1], 10);
        }
        
        // Look for patterns like "1", "01", etc. at the end
        const numberMatch = name.match(/(\d+)$/);
        if (numberMatch) {
          return parseInt(numberMatch[1], 10);
        }
        
        // Look for patterns like "1" anywhere in the name
        const anyNumberMatch = name.match(/(\d+)/);
        if (anyNumberMatch) {
          return parseInt(anyNumberMatch[1], 10);
        }
        
        // If no number found, use the index as fallback
        return 0;
      };
      
      const episodeA = getEpisodeNumber(a.name);
      const episodeB = getEpisodeNumber(b.name);
      
      // If both have episode numbers, sort by episode number
      if (episodeA !== 0 && episodeB !== 0) {
        return episodeA - episodeB;
      }
      
      // If only one has episode number, prioritize it
      if (episodeA !== 0) return -1;
      if (episodeB !== 0) return 1;
      
      // If neither has episode numbers, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }
  
  async getEpisodeBySlug(slug: string): Promise<Episode | undefined> {
    const [episode] = await db.select()
      .from(episodes)
      .where(eq(episodes.slug, slug));
    return episode;
  }
  
  async saveEpisode(episode: InsertEpisode): Promise<Episode> {
    const [newEpisode] = await db.insert(episodes).values({
      ...episode,
      filename: episode.filename || null,
      linkM3u8: episode.linkM3u8 || null
    }).returning();

    return newEpisode;
  }
  
  // Comment methods
  async getCommentsByMovieSlug(movieSlug: string, page: number, limit: number, userId?: number): Promise<{ data: Comment[], total: number }> {
    // Join comments with users table to get username
    const baseQuery = db.select({
      id: comments.id,
      userId: comments.userId,
      movieSlug: comments.movieSlug,
      content: comments.content,
      likes: comments.likes,
      dislikes: comments.dislikes,
      createdAt: comments.createdAt,
      username: users.username
    })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.movieSlug, movieSlug))
      .orderBy(desc(comments.createdAt));

    const commentsData = await baseQuery
      .limit(limit)
      .offset((page - 1) * limit);    // If userId is provided, get user reactions for each comment
    if (userId) {
      const commentIds = commentsData.map(c => c.id);
      const userReactions = await db.select()
        .from(userCommentReactions)
        .where(and(
          eq(userCommentReactions.userId, userId),
          inArray(userCommentReactions.commentId, commentIds)
        ));

      // Map reactions to comments
      const reactionsMap = new Map(userReactions.map(r => [r.commentId, r.reactionType]));
      
      // Add user reaction info to comments
      const commentsWithReactions = commentsData.map(comment => ({
        ...comment,
        hasLiked: reactionsMap.get(comment.id) === 'like',
        hasDisliked: reactionsMap.get(comment.id) === 'dislike'
      }));

      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.movieSlug, movieSlug));

      return { data: commentsWithReactions, total: count || 0 };
    }

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.movieSlug, movieSlug));

    return { data: commentsData, total: count || 0 };
  }
  
  async addComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments)
      .values({
        ...comment,
        likes: 0,
        dislikes: 0,
        createdAt: new Date()
      })
      .returning();
    
    // Get the username by joining with users table
    const [commentWithUsername] = await db.select({
      id: comments.id,
      userId: comments.userId,
      movieSlug: comments.movieSlug,
      content: comments.content,
      likes: comments.likes,
      dislikes: comments.dislikes,
      createdAt: comments.createdAt,
      username: users.username
    })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, newComment.id));
    
    return commentWithUsername as Comment;
  }
  
  async likeComment(commentId: number, userId: number): Promise<void> {
    // Check if user already has a reaction to this comment
    const existingReaction = await this.getUserReactionForComment(userId, commentId);
    
    if (existingReaction) {
      if (existingReaction.reactionType === 'like') {
        // User already liked, remove the like
        await this.removeUserReactionForComment(userId, commentId);
        await db.update(comments)
          .set({
            likes: sql`${comments.likes} - 1`
          })
          .where(eq(comments.id, commentId));
        return;
      } else {
        // User had disliked, change to like (mutual exclusivity)
        await db.update(userCommentReactions)
          .set({
            reactionType: 'like',
            createdAt: new Date()
          })
          .where(and(
            eq(userCommentReactions.userId, userId),
            eq(userCommentReactions.commentId, commentId)
          ));
        
        // Update comment counts (remove dislike, add like)
        await db.update(comments)
          .set({
            likes: sql`${comments.likes} + 1`,
            dislikes: sql`${comments.dislikes} - 1`
          })
          .where(eq(comments.id, commentId));
        return;
      }
    }
    
    // No existing reaction, add new like
    await db.insert(userCommentReactions).values({
      userId,
      commentId,
      reactionType: 'like',
      createdAt: new Date()
    });
    
    await db.update(comments)
      .set({
        likes: sql`${comments.likes} + 1`
      })
      .where(eq(comments.id, commentId));
  }
  
  async dislikeComment(commentId: number, userId: number): Promise<void> {
    // Check if user already has a reaction to this comment
    const existingReaction = await this.getUserReactionForComment(userId, commentId);
    
    if (existingReaction) {
      if (existingReaction.reactionType === 'dislike') {
        // User already disliked, remove the dislike
        await this.removeUserReactionForComment(userId, commentId);
        await db.update(comments)
          .set({
            dislikes: sql`${comments.dislikes} - 1`
          })
          .where(eq(comments.id, commentId));
        return;
      } else {
        // User had liked, change to dislike (mutual exclusivity)
        await db.update(userCommentReactions)
          .set({
            reactionType: 'dislike',
            createdAt: new Date()
          })
          .where(and(
            eq(userCommentReactions.userId, userId),
            eq(userCommentReactions.commentId, commentId)
          ));
        
        // Update comment counts (remove like, add dislike)
        await db.update(comments)
          .set({
            likes: sql`${comments.likes} - 1`,
            dislikes: sql`${comments.dislikes} + 1`
          })
          .where(eq(comments.id, commentId));
        return;
      }
    }
    
    // No existing reaction, add new dislike
    await db.insert(userCommentReactions).values({
      userId,
      commentId,
      reactionType: 'dislike',
      createdAt: new Date()
    });
    
    await db.update(comments)
      .set({
        dislikes: sql`${comments.dislikes} + 1`
      })
      .where(eq(comments.id, commentId));
  }
  
  async getUserReactionForComment(userId: number, commentId: number): Promise<UserCommentReaction | undefined> {
    const [reaction] = await db.select()
      .from(userCommentReactions)
      .where(and(
        eq(userCommentReactions.userId, userId),
        eq(userCommentReactions.commentId, commentId)
      ));
    return reaction;
  }

  async removeUserReactionForComment(userId: number, commentId: number): Promise<void> {
    await db.delete(userCommentReactions)
      .where(and(
        eq(userCommentReactions.userId, userId),
        eq(userCommentReactions.commentId, commentId)
      ));
  }
  
  // Watchlist methods
  async getWatchlist(userId: number): Promise<Movie[]> {
    const result = await db.select({ movie: movies })
      .from(watchlist)
      .innerJoin(movies, eq(watchlist.movieSlug, movies.slug))
      .where(eq(watchlist.userId, userId));
    
    return result.map(r => r.movie);
  }

  async checkWatchlist(userId: number, movieSlug: string): Promise<boolean> {
    const [exists] = await db.select()
      .from(watchlist)
      .where(and(
        eq(watchlist.userId, userId),
        eq(watchlist.movieSlug, movieSlug)
      ));
    return !!exists;
  }

  async addToWatchlist(watchlistItem: InsertWatchlist): Promise<void> {
    await db.insert(watchlist).values({
      ...watchlistItem,
      addedAt: new Date()
    });
  }

  async removeFromWatchlist(userId: number, movieSlug: string): Promise<void> {
    await db.delete(watchlist)
      .where(and(
        eq(watchlist.userId, userId),
        eq(watchlist.movieSlug, movieSlug)
      ));
  }
  
  // View History methods
  async getViewHistory(userId: number, limit?: number): Promise<Movie[]> {
    const query = db.select({ movie: movies })
      .from(viewHistory)
      .innerJoin(movies, eq(viewHistory.movieSlug, movies.slug))
      .where(eq(viewHistory.userId, userId))
      .orderBy(desc(viewHistory.lastViewedAt));

    if (limit) {
      query.limit(limit);
    }

    const result = await query;
    return result.map(r => r.movie);
  }

  async addToViewHistory(userId: number, movieSlug: string, progress: number = 0): Promise<void> {
    await db.insert(viewHistory).values({
      userId,
      movieSlug,
      progress,
      viewCount: 1,
      lastViewedAt: new Date()
    });
  }

  async updateViewProgress(userId: number, movieSlug: string, progress: number): Promise<void> {
    const [existing] = await db.select()
      .from(viewHistory)
      .where(and(
        eq(viewHistory.userId, userId),
        eq(viewHistory.movieSlug, movieSlug)
      ));

    if (existing) {
      await db.update(viewHistory)
        .set({
          progress,
          viewCount: sql`${viewHistory.viewCount} + 1`,
          lastViewedAt: new Date()
        })
        .where(and(
          eq(viewHistory.userId, userId),
          eq(viewHistory.movieSlug, movieSlug)
        ));
    } else {
      await this.addToViewHistory(userId, movieSlug, progress);
    }
  }

  async getViewedMovie(userId: number, movieSlug: string): Promise<ViewHistory | undefined> {
    const [viewedMovie] = await db.select()
      .from(viewHistory)
      .where(and(
        eq(viewHistory.userId, userId),
        eq(viewHistory.movieSlug, movieSlug)
      ));
    return viewedMovie;
  }

  // Content management methods
  async submitContentForApproval(approval: InsertContentApproval): Promise<ContentApproval> {
    const [newApproval] = await db.insert(contentApprovals).values({
      ...approval,
      status: ContentStatus.PENDING,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedByUserId: null,
      comments: approval.comments || null
    }).returning();
    return newApproval;
  }

  async approveContent(contentId: number, reviewerId: number, comments?: string): Promise<ContentApproval | undefined> {
    const [updatedApproval] = await db.update(contentApprovals)
      .set({
        status: ContentStatus.APPROVED,
        reviewedByUserId: reviewerId,
        reviewedAt: new Date(),
        comments: comments || null
      })
      .where(eq(contentApprovals.id, contentId))
      .returning();
    return updatedApproval;
  }

  async rejectContent(contentId: number, reviewerId: number, comments: string): Promise<ContentApproval | undefined> {
    const [updatedApproval] = await db.update(contentApprovals)
      .set({
        status: ContentStatus.REJECTED,
        reviewedByUserId: reviewerId,
        reviewedAt: new Date(),
        comments
      })
      .where(eq(contentApprovals.id, contentId))
      .returning();
    return updatedApproval;
  }

  async getPendingContent(page: number, limit: number): Promise<{ data: ContentApproval[], total: number }> {
    const baseQuery = db.select()
      .from(contentApprovals)
      .where(eq(contentApprovals.status, ContentStatus.PENDING))
      .orderBy(desc(contentApprovals.submittedAt));

    const data = await baseQuery
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(contentApprovals)
      .where(eq(contentApprovals.status, ContentStatus.PENDING));

    return { data, total: count || 0 };
  }

  async getContentByUser(userId: number, page: number, limit: number, status?: string): Promise<{ data: ContentApproval[], total: number }> {
    const conditions = [eq(contentApprovals.submittedByUserId, userId)];
    if (status) {
      conditions.push(eq(contentApprovals.status, status));
    }

    const baseQuery = db.select()
      .from(contentApprovals)
      .where(and(...conditions))
      .orderBy(desc(contentApprovals.submittedAt));

    const data = await baseQuery
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(contentApprovals)
      .where(and(...conditions));

    return { data, total: count || 0 };
  }
  
  async addAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs)
      .values({
        ...log,
        timestamp: new Date()
      })
      .returning();
    return auditLog;
  }

  async getAuditLogs(page: number, limit: number, filters?: {activityType?: string, userId?: number}): Promise<{ data: AuditLog[], total: number }> {
    const conditions = [];
    if (filters?.activityType) {
      conditions.push(eq(auditLogs.activityType, filters.activityType));
    }
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    const baseQuery = db.select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.timestamp));

    const data = await baseQuery
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    return { data, total: count || 0 };
  }
  // Add search and category methods
  async searchMovies(query: string, _normalizedQuery: string, page: number, limit: number, filters?: {section?: string, isRecommended?: boolean, type?: string}): Promise<{ data: Movie[], total: number }> {
    const offset = (page - 1) * limit;

    // Convert query to lowercase for case-insensitive search
    const lowercaseQuery = query.toLowerCase();

    // Build search conditions to search across multiple fields with explicit lowercasing
    const searchConditions = sql`(
      LOWER(${movies.name}) LIKE ${`%${lowercaseQuery}%`} OR 
      LOWER(${movies.originName}) LIKE ${`%${lowercaseQuery}%`} OR 
      LOWER(${movies.description}) LIKE ${`%${lowercaseQuery}%`} OR 
      LOWER(${movies.actors}) LIKE ${`%${lowercaseQuery}%`} OR 
      LOWER(${movies.directors}) LIKE ${`%${lowercaseQuery}%`}
    )`;

    let conditions = searchConditions;
    
    // Add filters if specified
    if (filters?.section) {
      conditions = sql`${conditions} AND ${movies.section} = ${filters.section}`;
      console.log(`[DEBUG] Adding section filter: ${filters.section} to search query`);
    }
    
    if (filters?.isRecommended !== undefined) {
      conditions = sql`${conditions} AND ${movies.isRecommended} = ${filters.isRecommended}`;
      console.log(`[DEBUG] Adding isRecommended filter: ${filters.isRecommended} to search query`);
    }
    
    if (filters?.type) {
      conditions = sql`${conditions} AND ${movies.type} = ${filters.type}`;
      console.log(`[DEBUG] Adding type filter: ${filters.type} to search query`);
    }

    const baseQuery = db.select()
      .from(movies)
      .where(conditions);

    const data = await baseQuery
      .orderBy(desc(movies.modifiedAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(movies)
      .where(conditions);

    return { data, total: count || 0 };
  }

  async getMoviesByCategory(categorySlug: string, page: number, limit: number, sortBy?: string): Promise<{ data: Movie[], total: number }> {
    const baseQuery = db.select()
      .from(movies)
      .where(sql`${movies.categories}::jsonb @> ${`["${categorySlug}"]`}::jsonb`);

    const sortedQuery = sortBy === 'popular'
      ? baseQuery.orderBy(desc(movies.view))
      : baseQuery.orderBy(desc(movies.modifiedAt));

    const data = await sortedQuery
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(movies)
      .where(sql`${movies.categories}::jsonb @> ${`["${categorySlug}"]`}::jsonb`);

    return { data, total: count || 0 };
  }

  async getMoviesBySection(section: string, page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Query movies by section field first
    const data = await db.select()
      .from(movies)
      .where(eq(movies.section, section))
      .orderBy(desc(movies.modifiedAt))
      .limit(limit)
      .offset(offset);
    
    // Count total movies in this section
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(movies)
      .where(eq(movies.section, section));
    
    // If anime section is requested but no movies found, fall back to type-based search
    if (section === 'anime' && data.length === 0) {
      console.log('[DEBUG] No movies found with section=anime, falling back to type-based search for hoathinh');
      
      // Search for movies with type exactly 'hoathinh' (Vietnamese for animation/anime)
      const animeConditions = sql`(
        ${movies.type} = 'hoathinh'
      )`;
      
      const animeData = await db.select()
        .from(movies)
        .where(animeConditions)
        .orderBy(desc(movies.modifiedAt))
        .limit(limit)
        .offset(offset);
      
      const [{ animeCount }] = await db.select({ animeCount: sql<number>`count(*)` })
        .from(movies)
        .where(animeConditions);
      
      console.log(`[DEBUG] Found ${animeData.length} anime movies with type='hoathinh'`);
      return { data: animeData, total: animeCount || 0 };
    }
    
    return { data, total: count || 0 };
  }

  async getRecommendedMovies(page: number, limit: number): Promise<{ data: Movie[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Query movies that are marked as recommended
    const data = await db.select()
      .from(movies)
      .where(eq(movies.isRecommended, true))
      .orderBy(desc(movies.modifiedAt))
      .limit(limit)
      .offset(offset);
    
    // Count total recommended movies
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(movies)
      .where(eq(movies.isRecommended, true));
    
    console.log(`[DEBUG] Found ${count} recommended movies`);
    return { data, total: count || 0 };
  }

  // Cache implementation - using Redis-like API
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  private getCacheKey(type: string, ...params: any[]): string {
    return `${type}:${params.join(':')}`;
  }

  private async setCache<T>(key: string, data: T): Promise<void> {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL
    });
  }

  private async clearCache(key: string): Promise<void> {
    this.cache.delete(key);
  }

  private async getCache<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  async clearMovieDetailCache(slug: string): Promise<void> {
    const key = this.getCacheKey('movieDetail', slug);
    await this.clearCache(key);
    console.log(`[DEBUG] Cleared cache for movie: ${slug}`);
  }

  async cacheMovieList(data: MovieListResponse, page: number): Promise<void> {
    await this.setCache(this.getCacheKey('movieList', page), data);
  }

  async cacheMovieDetail(data: MovieDetailResponse): Promise<void> {
    // Ensure the section and isRecommended fields are preserved
    if (data && data.movie) {
      // Deep clone to avoid reference issues
      const movieClone = JSON.parse(JSON.stringify(data.movie));
      
      // Ensure section property is correctly typed
      if (movieClone.section === undefined || movieClone.section === null) {
        movieClone.section = null;
      }
      
      // Ensure isRecommended is a proper boolean
      // Use triple equals to ensure we're doing a strict equality check
      movieClone.isRecommended = movieClone.isRecommended === true;
      
      console.log(`[DEBUG] Caching movie ${movieClone.slug || 'unknown'} with:`, {
        section: movieClone.section,
        sectionType: typeof movieClone.section,
        isRecommended: movieClone.isRecommended,
        isRecommendedType: typeof movieClone.isRecommended
      });
      
      // Replace the movie object with our fixed version
      data.movie = movieClone;
    }
    
    await this.setCache(this.getCacheKey('movieDetail', data.movie.slug), data);
  }

  async cacheMovieCategory(data: MovieListResponse, categorySlug: string, page: number): Promise<void> {
    await this.setCache(this.getCacheKey('movieCategory', categorySlug, page), data);
  }

  async getMovieListCache(page: number): Promise<MovieListResponse | null> {
    return this.getCache(this.getCacheKey('movieList', page));
  }

  async getMovieDetailCache(slug: string): Promise<MovieDetailResponse | null> {
    return this.getCache(this.getCacheKey('movieDetail', slug));
  }

  async getMovieCategoryCache(categorySlug: string, page: number): Promise<MovieListResponse | null> {
    return this.getCache(this.getCacheKey('movieCategory', categorySlug, page));
  }
}

// Fix export to use named export for storage instance
export const storage = new DatabaseStorage();
