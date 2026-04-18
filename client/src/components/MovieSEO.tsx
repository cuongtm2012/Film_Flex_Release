import { Helmet } from 'react-helmet-async';
import { MovieDetailResponse } from '@shared/schema';
import { logger } from '@/lib/logger';

const BASE_URL = 'https://phimgg.com';

/** Ensure absolute URL for OG/Twitter images */
function toAbsoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Extract YouTube video ID from various YouTube URL formats */
function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^[a-zA-Z0-9_-]{11}$/, // Already a video ID
  ];
  for (const pattern of patterns) {
    const match = String(url).match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Parse movie duration to ISO 8601 (e.g. "120" → "PT120M", "1h 30m" → "PT1H30M") */
function parseDuration(time: string | null | undefined): string | undefined {
  if (!time) return undefined;
  const trimmed = String(time).trim();
  // Try "Xh Ym" or "Xh" first (parseInt would wrongly get 1 from "1h 30m")
  const hmsMatch = trimmed.match(/(\d+)\s*h(?:our)?s?\s*(\d+)?\s*m(?:in)?/i);
  if (hmsMatch) {
    const h = parseInt(hmsMatch[1], 10);
    const m = hmsMatch[2] ? parseInt(hmsMatch[2], 10) : 0;
    return `PT${h}H${m}M`;
  }
  // Vietnamese: "90 phút", "1 giờ 30 phút"
  const vnMatch = trimmed.match(/(\d+)\s*giờ\s*(\d+)?\s*phút?/i);
  if (vnMatch) {
    const h = parseInt(vnMatch[1], 10);
    const m = vnMatch[2] ? parseInt(vnMatch[2], 10) : 0;
    return `PT${h}H${m}M`;
  }
  // Plain number = minutes: "120", "90 min"
  const mins = parseInt(trimmed, 10);
  if (!isNaN(mins) && mins > 0) return `PT${mins}M`;
  return undefined;
}

interface MovieSEOProps {
  movie: MovieDetailResponse['movie'];
  slug: string;
}

export function MovieSEO({ movie, slug }: MovieSEOProps) {
  if (!movie || !movie.name) return null;

  try {
    const movieTitle = `Xem ${movie.name} HD Vietsub, thuyết minh | PhimGG`;
    const movieDescription = `Xem ${movie.name} chất lượng HD tại PhimGG. Cập nhật tập mới nhanh, hỗ trợ Vietsub và thuyết minh, xem miễn phí trên mọi thiết bị.`;
    const movieUrl = `${BASE_URL}/movie/${slug}`;
    const imageUrl = toAbsoluteUrl(movie.poster_url || movie.thumb_url);

    const keywords = [
      'xem phim online',
      movie.name,
      movie.type === 'series' ? 'phim bộ' : 'phim lẻ',
      'phim HD',
      'xem phim miễn phí',
      'PhimGG',
      ...(movie.category?.map(cat => cat.name) ?? []),
      ...(movie.country?.map(country => country.name) ?? []),
      movie.year?.toString() || ''
    ].filter(Boolean).join(', ');

    const movieSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": movie.type === 'series' ? "TVSeries" : "Movie",
      "name": movie.name,
      "alternateName": movie.origin_name,
      "description": movie.content || movieDescription,
      "url": movieUrl,
      "image": imageUrl,
      "datePublished": movie.year ? `${movie.year}-01-01` : undefined,
      "genre": movie.category?.map(cat => cat.name) ?? [],
      "director": movie.director?.map(director => ({ "@type": "Person", "name": director })) ?? [],
      "actor": movie.actor?.map(actor => ({ "@type": "Person", "name": actor })) ?? [],
      "productionCompany": { "@type": "Organization", "name": "PhimGG" },
      "provider": { "@type": "Organization", "name": "PhimGG", "url": BASE_URL },
      "contentRating": movie.quality || "HD",
      "inLanguage": movie.lang || "vi",
      "countryOfOrigin": movie.country?.map(c => c.name) ?? []
    };
    const duration = parseDuration(movie.time);
    if (duration) movieSchema.duration = duration;

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": movie.type === 'series' ? "Phim bộ" : "Phim lẻ", "item": `${BASE_URL}/${movie.type === 'series' ? 'tv' : 'movies'}` },
        { "@type": "ListItem", "position": 3, "name": movie.name, "item": movieUrl }
      ]
    };

    // VideoObject schema for YouTube trailers (helps Google display video in search)
    const trailerUrl = (movie as any).trailer_url || (movie as any).trailerUrl;
    const youtubeVideoId = extractYouTubeId(trailerUrl);
    const videoSchema = youtubeVideoId ? {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "name": `${movie.name} - Trailer`,
      "description": movieDescription,
      "thumbnailUrl": imageUrl,
      "uploadDate": movie.year ? `${movie.year}-01-01` : undefined,
      "duration": duration,
      "contentUrl": `${BASE_URL}/movie/${slug}`,
      "embedUrl": `https://www.youtube.com/embed/${youtubeVideoId}`,
      "publisher": {
        "@type": "Organization",
        "name": "PhimGG",
        "url": BASE_URL
      }
    } : null;

    return (
      <Helmet>
        {/* Basic Meta Tags */}
        <title>{movieTitle}</title>
        <meta name="description" content={movieDescription} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={movieUrl} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={movieTitle} />
        <meta property="og:description" content={movieDescription} />
        <meta property="og:type" content="video.movie" />
        <meta property="og:url" content={movieUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:site_name" content="PhimGG" />
        <meta property="og:locale" content="vi_VN" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@PhimGG" />
        <meta name="twitter:title" content={movieTitle} />
        <meta name="twitter:description" content={movieDescription} />
        <meta name="twitter:image" content={imageUrl} />
        
        {/* Movie-specific Meta Tags */}
        <meta name="video:release_date" content={movie.year ? `${movie.year}-01-01` : ''} />
        <meta name="video:duration" content={movie.time || ''} />
        <meta name="video:genre" content={movie.category?.map(cat => cat.name)?.join(', ') ?? ''} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(movieSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        {videoSchema && (
          <script type="application/ld+json">
            {JSON.stringify(videoSchema)}
          </script>
        )}
      </Helmet>
    );
  } catch (error) {
    logger.error('MovieSEO: Error generating SEO data', error);
    return null;
  }
}

export default MovieSEO;
