import React from 'react';
import { Helmet } from 'react-helmet';

interface Movie {
  slug: string;
  // ...other movie properties
}

interface MovieSEOProps {
  movie: Movie;
}

export function MovieSEO({ movie }: MovieSEOProps) {
  // Ensure canonical URL includes trailing slash for consistency with sitemap
  const canonicalUrl = `https://phimgg.com/movie/${movie.slug}/`;

  return (
    <Helmet>
      {/* ...existing meta tags... */}
      <link rel="canonical" href={canonicalUrl} />
      {/* ...existing Open Graph tags... */}
      <meta property="og:url" content={canonicalUrl} />
      {/* ...existing structured data... */}
    </Helmet>
  );
}