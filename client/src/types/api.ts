// API Response Types

export interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  totalItemsPerPage: number;
}

export interface Movie {
  _id?: string;
  movieId: string;
  name: string;
  originName?: string;
  slug: string;
  type?: string;
  year?: number;
  lang?: string;
  quality?: string;
  view?: number;
  category?: {
    id?: string;
    name?: string;
    slug?: string;
  }[];
  country?: {
    id?: string;
    name?: string;
    slug?: string;
  }[];
  thumbUrl?: string;
  posterUrl?: string;
  trailerUrl?: string;
  time?: string;
  status?: string;
  description?: string;
  actors?: string;
  directors?: string;
}

export interface Episode {
  id?: number;
  movieId: string;
  server_name?: string;
  server_data: {
    name?: string;
    slug?: string;
    filename?: string;
    link_embed?: string;
    link_m3u8?: string;
  }[];
}

export interface MovieListResponse {
  status: boolean;
  items: Movie[];
  pagination?: Pagination;
}

export interface MovieDetailResponse {
  status: boolean;
  msg?: string;
  movie: Movie;
  episodes: Episode[];
}

export interface CommentItem {
  id: number;
  userId: number;
  movieSlug: string;
  content: string;
  likes: number;
  dislikes: number;
  createdAt?: string;
  user?: {
    username: string;
    role?: string;
  };
}

export interface CommentsResponse {
  data: CommentItem[];
  total: string | number;
  page?: number;
  limit?: number;
}

export interface WatchlistItem {
  id: number;
  userId: number;
  movieSlug: string;
  addedAt?: string;
  movie?: Movie;
}

export interface WatchlistResponse {
  data: WatchlistItem[];
  total: string | number;
}

export interface ApiError {
  message: string;
  error?: string;
  status?: number;
}