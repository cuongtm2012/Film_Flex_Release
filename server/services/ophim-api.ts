/**
 * Ophim API Service
 * 
 * Service để tương tác với Ophim API (ophim1.com)
 * - Lấy danh sách phim mới theo page
 * - Lấy chi tiết phim theo slug
 */

const OPHIM_BASE_URL = 'https://ophim1.com/v1/api';

// Ophim API response types
export interface OphimMovieListItem {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  type: string;
  thumb_url: string;
  poster_url: string;
  sub_docquyen?: boolean;
  chieurap?: boolean;
  time?: string;
  episode_current?: string;
  quality?: string;
  lang?: string;
  year?: number;
  category?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  country?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface OphimMovieListResponse {
  status: string;
  msg?: string;
  data: {
    seoOnPage?: {
      titleHead?: string;
    };
    breadCrumb?: any[];
    titlePage?: string;
    items: OphimMovieListItem[];
    params?: {
      pagination?: {
        totalItems: number;
        totalItemsPerPage: number;
        currentPage: number;
        totalPages: number;
      };
    };
  };
}

export interface OphimMovieDetailResponse {
  status: string;
  message?: string;
  data: {
    seoOnPage?: any;
    breadCrumb?: any[];
    params?: {
      slug: string;
    };
    item: {
      _id: string;
      name: string;
      slug: string;
      origin_name: string;
      content: string;
      type: string;
      status: string;
      thumb_url: string;
      poster_url: string;
      is_copyright?: boolean;
      sub_docquyen?: boolean;
      chieurap?: boolean;
      trailer_url?: string;
      time?: string;
      episode_current?: string;
      episode_total?: string;
      quality?: string;
      lang?: string;
      notify?: string;
      showtimes?: string;
      year?: number;
      view?: number;
      actor?: string[];
      director?: string[];
      category?: Array<{
        id: string;
        name: string;
        slug: string;
      }>;
      country?: Array<{
        id: string;
        name: string;
        slug: string;
      }>;
      episodes?: Array<{
        server_name: string;
        is_ai?: boolean;
        server_data: Array<{
          name: string;
          slug: string;
          filename: string;
          link_embed: string;
          link_m3u8?: string;
        }>;
      }>;
    };
    APP_DOMAIN_CDN_IMAGE?: string;
  };
}

/**
 * Fetch danh sách phim mới từ Ophim API
 * @param page - Số trang cần lấy (mặc định: 1)
 * @returns Promise<OphimMovieListResponse>
 */
export async function fetchOphimMovieList(page: number = 1): Promise<OphimMovieListResponse> {
  const url = `${OPHIM_BASE_URL}/danh-sach/phim-moi?page=${page}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PhimGG-Importer/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ophim API returned ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    
    if (data.status !== 'success' && data.status !== true) {
      throw new Error(`Ophim API error: ${data.msg || 'Unknown error'}`);
    }

    return data as OphimMovieListResponse;
  } catch (error) {
    console.error(`[Ophim API] Error fetching movie list (page ${page}):`, error);
    throw error;
  }
}

/**
 * Fetch chi tiết phim từ Ophim API theo slug
 * @param slug - Slug của phim
 * @returns Promise<OphimMovieDetailResponse>
 */
export async function fetchOphimMovieDetail(slug: string): Promise<OphimMovieDetailResponse> {
  const url = `${OPHIM_BASE_URL}/phim/${slug}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PhimGG-Importer/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ophim API returned ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    
    // Validate response structure
    if (!data) {
      throw new Error('Empty response from API');
    }
    
    if (!data.status || data.status === 'error' || data.status === false) {
      throw new Error(`Ophim API error: ${data.message || data.msg || 'Movie not found'}`);
    }

    // Validate data.item exists
    if (!data.data || !data.data.item) {
      console.error(`[Ophim API] Invalid response structure for ${slug}:`, JSON.stringify(data, null, 2));
      throw new Error('Response missing data.item object');
    }

    return data as OphimMovieDetailResponse;
  } catch (error) {
    console.error(`[Ophim API] Error fetching movie detail (${slug}):`, error);
    throw error;
  }
}

/**
 * Retry wrapper cho API calls với exponential backoff
 * @param fn - Async function to retry
 * @param retries - Number of retries (default: 3)
 * @param delay - Initial delay in ms (default: 1000)
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    console.log(`[Ophim API] Retrying after ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return retryApiCall(fn, retries - 1, delay * 2);
  }
}

/**
 * Rate limiter để tránh spam API
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private lastCallTime = 0;
  
  constructor(private minDelay: number = 500) {} // 500ms between calls
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastCall = now - this.lastCallTime;
          
          if (timeSinceLastCall < this.minDelay) {
            await new Promise(r => setTimeout(r, this.minDelay - timeSinceLastCall));
          }
          
          this.lastCallTime = Date.now();
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.processNext();
        }
      });
      
      if (!this.processing) {
        this.processNext();
      }
    });
  }
  
  private processNext() {
    const next = this.queue.shift();
    if (next) {
      this.processing = true;
      next();
    } else {
      this.processing = false;
    }
  }
}
