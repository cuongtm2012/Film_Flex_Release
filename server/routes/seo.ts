import { Router, type Request, type Response } from 'express';
import { storage } from '../storage.js';

const router = Router();
const BASE_URL = 'https://phimgg.com';
const MOVIES_PER_SITEMAP = 5000;

// Sitemap index - lists all sitemaps
router.get('/sitemap-index.xml', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', 'application/xml');
    const currentDate = new Date().toISOString().split('T')[0];
    const totalMovies = await storage.getMovieCount();
    const movieSitemapCount = Math.ceil(totalMovies / MOVIES_PER_SITEMAP);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/api/sitemap-pages.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>`;

    for (let i = 0; i < movieSitemapCount; i++) {
      xml += `
  <sitemap>
    <loc>${BASE_URL}/api/sitemap-movies-${i + 1}.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>`;
    }

    xml += `
</sitemapindex>`;

    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Static pages sitemap
router.get('/sitemap-pages.xml', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', 'application/xml');
    const currentDate = new Date().toISOString().split('T')[0];
    const years = await storage.getAvailableYears();
    const yearUrls = years.slice(0, 10).map(y =>
      `  <url>
    <loc>${BASE_URL}/year/${y}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    ).join('\n');

    const genreSlugs = ['action', 'comedy', 'drama', 'horror', 'thriller', 'romance', 'sci-fi', 'fantasy', 'adventure', 'animation'];
    const genreUrls = genreSlugs.map(slug =>
      `  <url>
    <loc>${BASE_URL}/genre/${slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    ).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/movies</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tv</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/new-releases</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/top-rated</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/news</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/search</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE_URL}/genres</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
${genreUrls}
${yearUrls}
</urlset>`;

    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap-pages:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Movie sitemaps - sitemap-movies-1.xml, sitemap-movies-2.xml, ...
router.get('/sitemap-movies-:index.xml', async (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 1) {
      return res.status(400).send('Invalid sitemap index');
    }

    res.set('Content-Type', 'application/xml');
    const currentDate = new Date().toISOString().split('T')[0];
    const offset = (index - 1) * MOVIES_PER_SITEMAP;
    const movies = await storage.getMoviesForSitemap(offset, MOVIES_PER_SITEMAP);

    const urls = movies.map(m =>
      `  <url>
    <loc>${BASE_URL}/movie/${m.slug}/</loc>
    <lastmod>${m.modifiedAt || currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    ).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.send(sitemap);
  } catch (error) {
    console.error('Error generating movie sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Legacy single sitemap - redirect to index for backward compatibility
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  res.redirect(302, '/api/sitemap-index.xml');
});

// Serve robots.txt dynamically
router.get('/robots.txt', (_req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  const robotsTxt = `User-agent: *
Allow: /

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/auth/
Disallow: /api/users/
Disallow: /_next/

# Allow important SEO pages
Allow: /api/sitemap-index.xml
Allow: /api/sitemap-pages.xml
Allow: /api/sitemap-movies-
Allow: /api/robots.txt

# Sitemap location (index lists all sitemaps)
Sitemap: ${BASE_URL}/api/sitemap-index.xml
`;

  res.send(robotsTxt);
});

export default router;
