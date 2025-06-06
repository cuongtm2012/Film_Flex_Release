import { Helmet } from 'react-helmet-async';
import { MovieDetailResponse } from '@shared/schema';

interface MovieSEOProps {
  movie: MovieDetailResponse['movie'];
  slug: string;
}

export function MovieSEO({ movie, slug }: MovieSEOProps) {
  // Early return if movie is not available  if (!movie || !movie.name) {
    return null;
  }

  try {
    // Generate movie-specific title and description
    const movieTitle = `Watch ${movie.name} Online - HD Full ${movie.type === 'series' ? 'Series' : 'Movie'} | PhimGG`;
    const movieDescription = `Stream ${movie.name} in HD quality on PhimGG.com. Watch full episodes and enjoy the latest updates for free on your favorite movie platform.`;
    
    // Debug log for movie data structure
    console.log('MovieSEO: Processing movie data', {
      name: movie.name,
      type: movie.type,
      hasCategory: !!movie.category,
      categoryLength: movie.category?.length,
      hasCountry: !!movie.country,
      countryLength: movie.country?.length,
      year: movie.year
    });    // Generate keywords based on movie data
    const keywords = [
      'watch online',
      movie.name,
      movie.type === 'series' ? 'TV series' : 'movie',
      'HD quality',
      'free streaming',
      'PhimGG',
      ...(movie.category?.map(cat => cat.name) ?? []),
      ...(movie.country?.map(country => country.name) ?? []),
      movie.year?.toString() || ''
    ].filter(Boolean).join(', ');
      console.log('MovieSEO: Keywords generated successfully', keywords.substring(0, 100) + '...');

    // Generate structured data for the movie
  const structuredData = {
    "@context": "https://schema.org",
    "@type": movie.type === 'series' ? "TVSeries" : "Movie",
    "name": movie.name,
    "alternateName": movie.origin_name,
    "description": movie.content || movieDescription,
    "url": `https://phimgg.com/movie/${slug}`,
    "image": movie.poster_url || movie.thumb_url,
    "datePublished": movie.year ? `${movie.year}-01-01` : undefined,    "genre": movie.category?.map(cat => cat.name) ?? [],
    "director": movie.director?.map(director => ({
      "@type": "Person",
      "name": director
    })) ?? [],
    "actor": movie.actor?.map(actor => ({
      "@type": "Person", 
      "name": actor
    })) ?? [],
    "productionCompany": {
      "@type": "Organization",
      "name": "PhimGG"
    },
    "provider": {
      "@type": "Organization",
      "name": "PhimGG",
      "url": "https://phimgg.com"
    },    "aggregateRating": undefined, // No rating data available from current movie schema
    "duration": movie.time ? `PT${movie.time}` : undefined,
    "contentRating": movie.quality || "HD",
    "inLanguage": movie.lang || "en",
    "countryOfOrigin": movie.country?.map(country => country.name) ?? []  };

    return (
      <Helmet>
        {/* Basic Meta Tags */}
        <title>{movieTitle}</title>
        <meta name="description" content={movieDescription} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={`https://phimgg.com/movie/${slug}`} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={movieTitle} />
        <meta property="og:description" content={movieDescription} />
        <meta property="og:type" content="video.movie" />
        <meta property="og:url" content={`https://phimgg.com/movie/${slug}`} />
        <meta property="og:image" content={movie.poster_url || movie.thumb_url} />
        <meta property="og:site_name" content="PhimGG" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@PhimGG" />
        <meta name="twitter:title" content={movieTitle} />
        <meta name="twitter:description" content={movieDescription} />
        <meta name="twitter:image" content={movie.poster_url || movie.thumb_url} />
        
        {/* Movie-specific Meta Tags */}
        <meta name="video:release_date" content={movie.year ? `${movie.year}-01-01` : ''} />
        <meta name="video:duration" content={movie.time || ''} />
        <meta name="video:genre" content={movie.category?.map(cat => cat.name)?.join(', ') ?? ''} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData, null, 2)}
        </script>
      </Helmet>
    );
  } catch (error) {
    console.error('MovieSEO: Error generating SEO data', error);
    return null;
  }
}

export default MovieSEO;
