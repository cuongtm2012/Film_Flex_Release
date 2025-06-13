import { Router } from 'express';
import { storage } from '../storage.js';

const router = Router();

// Generate dynamic sitemap with actual movie data
router.get('/sitemap.xml', async (_req, res) => {
  try {
    res.set('Content-Type', 'application/xml');
    
    // Get current date for lastmod
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Fetch some movies for the sitemap (limit to avoid huge sitemaps)
    const moviesResult = await storage.getMovies(1, 500, 'latest'); // Get first 500 movies
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main pages -->
  <url>
    <loc>https://phimgg.com/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/movies</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/series</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/anime</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/genres</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Genre pages -->
  <url>
    <loc>https://phimgg.com/genre/action</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/genre/comedy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/genre/drama</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/genre/horror</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/genre/thriller</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/genre/romance</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/genre/sci-fi</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/genre/fantasy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    // Add individual movie URLs
    if (moviesResult.data && moviesResult.data.length > 0) {
      sitemap += `\n  <!-- Movie pages -->\n`;
      
      for (const movie of moviesResult.data) {
        const movieLastMod = movie.modifiedAt ? 
          new Date(movie.modifiedAt).toISOString().split('T')[0] : 
          currentDate;
          
        sitemap += `  <url>
    <loc>https://phimgg.com/movie/${movie.slug}</loc>
    <lastmod>${movieLastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    // Add year-based pages
    sitemap += `
  <!-- Year-based pages -->
  <url>
    <loc>https://phimgg.com/year/2025</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/year/2024</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://phimgg.com/year/2023</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Serve robots.txt dynamically
router.get('/robots.txt', (_req, res) => {
  res.set('Content-Type', 'text/plain');
    const robotsTxt = `User-agent: *
Allow: /

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/auth/
Disallow: /api/users/
Disallow: /_next/

# Allow important SEO pages
Allow: /api/sitemap.xml
Allow: /api/robots.txt

# Sitemap location
Sitemap: https://phimgg.com/api/sitemap.xml

# Crawl delay for better server performance
Crawl-delay: 1`;

  res.send(robotsTxt);
});

export default router;
