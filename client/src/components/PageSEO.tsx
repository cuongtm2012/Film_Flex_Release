import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://phimgg.com';

interface PageSEOProps {
  title: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  noIndex?: boolean;
  ogImage?: string;
}

export function PageSEO({
  title,
  description = 'Stream thousands of HD movies and TV shows free on PhimGG.com. Latest releases, classics, and exclusive content.',
  canonical,
  keywords,
  noIndex = false,
  ogImage = 'https://phimgg.com/og-image.jpg'
}: PageSEOProps) {
  const fullTitle = title.includes('PhimGG') ? title : `${title} | PhimGG`;
  const canonicalUrl = canonical ? (canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical.startsWith('/') ? '' : '/'}${canonical}`) : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noIndex && <meta name="robots" content="noindex, follow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="PhimGG" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

export default PageSEO;
