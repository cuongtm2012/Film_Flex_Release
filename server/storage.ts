import { 
  User, InsertUser, 
  Movie, InsertMovie, 
  Episode, InsertEpisode, 
  Comment, InsertComment, 
  Watchlist, InsertWatchlist,
  MovieListResponse, MovieDetailResponse
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  
  // Cache methods
  cacheMovieList(data: MovieListResponse, page: number): Promise<void>;
  cacheMovieDetail(data: MovieDetailResponse): Promise<void>;
  getMovieListCache(page: number): Promise<MovieListResponse | undefined>;
  getMovieDetailCache(slug: string): Promise<MovieDetailResponse | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private movies: Map<string, Movie>; // Key is slug
  private episodes: Map<string, Episode>; // Key is slug
  private comments: Map<number, Comment>;
  private watchlists: Watchlist[];
  private movieListCache: Map<number, MovieListResponse>; // Key is page number
  private movieDetailCache: Map<string, MovieDetailResponse>; // Key is slug
  
  private currentUserId: number = 1;
  private currentMovieId: number = 1;
  private currentEpisodeId: number = 1;
  private currentCommentId: number = 1;
  private currentWatchlistId: number = 1;

  constructor() {
    this.users = new Map();
    this.movies = new Map();
    this.episodes = new Map();
    this.comments = new Map();
    this.watchlists = [];
    this.movieListCache = new Map();
    this.movieDetailCache = new Map();
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
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
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
}

export const storage = new MemStorage();
