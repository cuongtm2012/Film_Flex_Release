import { Helmet } from 'react-helmet-async';
import { useLocation } from 'wouter';

const BASE_URL = 'https://phimgg.com';

interface PageSEOProps {
  title: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  noIndex?: boolean;
  ogImage?: string;
  breadcrumbItems?: Array<{ name: string; path: string }>;
}

export function PageSEO({
  title,
  description = 'Xem phim lẻ, phim bộ HD miễn phí tại PhimGG với Vietsub và thuyết minh. Cập nhật phim mới mỗi ngày, tốc độ cao, xem mượt trên mọi thiết bị.',
  canonical,
  keywords,
  noIndex = false,
  ogImage = 'https://phimgg.com/og-image.jpg',
  breadcrumbItems
}: PageSEOProps) {
  const [locationPath] = useLocation();
  const fullTitle = title.includes('PhimGG') ? title : `${title} | PhimGG`;
  const pathForCanonical = (() => {
    const pathOnly = locationPath.split('?')[0] || '/';
    return pathOnly === '' ? '/' : pathOnly;
  })();
  const resolvedCanonical = canonical ?? pathForCanonical;
  const canonicalUrl = (() => {
    const c = resolvedCanonical;
    if (!c) return undefined;
    return c.startsWith('http') ? c : `${BASE_URL}${c.startsWith('/') ? '' : '/'}${c}`;
  })();

  // Generate BreadcrumbList schema if breadcrumbItems provided
  const breadcrumbSchema = breadcrumbItems ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${BASE_URL}${item.path.startsWith('/') ? '' : '/'}${item.path}`
    }))
  } : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta name="language" content="vi" />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noIndex && <meta name="robots" content="noindex, follow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="vi_VN" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="PhimGG" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Breadcrumb schema */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
    </Helmet>
  );
}

export default PageSEO;
