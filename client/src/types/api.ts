// API Response Types

export interface Movie {
  id: number;
  name: string;
  originName?: string;
  slug: string;
  thumbUrl?: string;
  posterUrl?: string;
  year?: number;
  quality?: string;
  lang?: string;
  time?: string;
  director?: string;
  actor?: string;
  country?: {
    name: string;
    slug: string;
  }[];
  category?: {
    name: string;
    slug: string;
  }[];
  type?: string;
  trailerUrl?: string;
  viewCount?: number;
  status?: boolean;
  chieurap?: boolean;
  hot?: boolean;
  rate?: string;
  createdAt?: string;
  updatedAt?: string;
  content?: string;
}

export interface Episode {
  id: number;
  name: string;
  slug: string;
  filename?: string;
  link?: string;
  type?: string;
  server?: string;
  episode?: number;
  movieId: number;
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  id: number;
  content: string;
  userId: number;
  movieId: number;
  parentId?: number;
  likes: number;
  dislikes: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
  replies?: Comment[];
}

// User Management Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
  created_at: string;
  updated_at: string;
  last_login?: string;
  profile_image?: string;
  subscription_status?: 'free' | 'premium' | 'vip';
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
}

export interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  totalItemsPerPage: number;
}

export interface UserListResponse {
  status: boolean;
  users: User[];
  pagination: Pagination;
}

export interface UserResponse {
  status: boolean;
  user: User;
  message?: string;
}

export interface MovieListResponse {
  status: boolean;
  items: Movie[];
  pagination?: Pagination;
  message?: string;
}

export interface MovieDetailResponse {
  status: boolean;
  movie: Movie;
  episodes?: Episode[];
  message?: string;
}

export interface CommentListResponse {
  status: boolean;
  comments: Comment[];
  pagination?: Pagination;
  message?: string;
}

export interface ApiError {
  status: boolean;
  message: string;
  statusCode?: number;
}

export interface WatchlistItem {
  id: number;
  userId: number;
  movieId: number;
  isWatched: boolean;
  createdAt: string;
  updatedAt: string;
  movie: Movie;
}

export interface WatchlistResponse {
  status: boolean;
  items: WatchlistItem[];
  pagination?: Pagination;
  message?: string;
}