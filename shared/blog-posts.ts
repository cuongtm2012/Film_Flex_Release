/**
 * Blog posts — used by Blog list, Blog post detail page, and sitemap.
 */

export type BlogCategory = 'Entertainment' | 'Technology' | 'Company' | 'Guides';

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: BlogCategory;
  tags: string[];
  image: string;
  featured?: boolean;
  /** Plain text, paragraphs separated by blank lines */
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    title: 'The Evolution of Streaming: From DVD Rentals to AI-Powered Recommendations',
    excerpt:
      'Explore the fascinating journey of how streaming technology has transformed from its humble beginnings to the sophisticated, personalized experience we enjoy today.',
    author: 'Alex Johnson',
    date: 'April 28, 2025',
    readTime: '8 min',
    category: 'Technology',
    tags: ['streaming', 'technology', 'AI', 'history'],
    image:
      'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    featured: true,
    content: `Streaming has evolved from physical discs to adaptive bitrate delivery and recommendation systems trained on viewer signals. On PhimGG, we focus on fast playback and catalog breadth so you can jump from classics to new releases without friction.

Personalization is not magic—it is a mix of editorial curation, content metadata, and systems that surface the right title at the right time. This article outlines how those pieces fit together at a high level.`,
  },
  {
    id: 2,
    title: 'Behind the Scenes: How PhimGG Curates Content for Global Audiences',
    excerpt:
      'Get an exclusive look at our content curation process and how we ensure diverse, quality entertainment for viewers worldwide.',
    author: 'Samantha Lee',
    date: 'April 22, 2025',
    readTime: '6 min',
    category: 'Company',
    tags: ['curation', 'global', 'content'],
    image:
      'https://images.unsplash.com/photo-1540224871915-bc8ffb782bdf?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1374&q=80',
    featured: true,
    content: `Our team balances popularity signals with editorial judgment: trending titles get visibility, while regional gems still find an audience through categories and collections.

Quality means more than resolution—it includes subtitles, encoding stability, and discoverability. That is the standard we optimize for every week.`,
  },
  {
    id: 3,
    title: '10 Hidden Gems You Need to Stream This Weekend',
    excerpt:
      'Discover critically acclaimed but lesser-known films and shows that deserve a spot on your watchlist.',
    author: 'Marcus Chen',
    date: 'April 15, 2025',
    readTime: '5 min',
    category: 'Entertainment',
    tags: ['recommendations', 'movies', 'tv shows'],
    image:
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1425&q=80',
    content: `Not every great title dominates opening weekend headlines. Start by filtering genres you rarely pick, then skim year and ratings—often the best surprises hide just outside the top 10 lists.

Add a couple of picks to My List on PhimGG so you always have backups when you finish your current binge.`,
  },
  {
    id: 4,
    title: 'Maximize Your Streaming Experience: Tips for the Perfect Movie Night',
    excerpt:
      'From audio setup to lighting and snacks, here is everything you need to create the ultimate home theater experience.',
    author: 'Olivia Rodriguez',
    date: 'April 10, 2025',
    readTime: '7 min',
    category: 'Guides',
    tags: ['home theater', 'tips', 'streaming quality'],
    image:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    content: `Dim the lighting, enable subtitles when dialogue mixes are quiet, and pick a bitrate your network can sustain—buffering ruins tension faster than a spoiler.

On mobile, headphones with clarity beat raw volume; on TV, soundbars with dialogue mode help more than raw bass.`,
  },
  {
    id: 5,
    title: 'The Rise of International Content and Why It Matters',
    excerpt:
      'How global storytelling is breaking language barriers and bringing diverse perspectives to mainstream entertainment.',
    author: 'Jamal Washington',
    date: 'April 5, 2025',
    readTime: '9 min',
    category: 'Entertainment',
    tags: ['international', 'diversity', 'global'],
    image:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    content: `Audiences are more open than ever to subtitles and dubbing when stories resonate. International series often innovate pacing and structure before Hollywood adopts them.

PhimGG continues to expand catalogs with Vietnamese subtitles so more viewers can explore titles beyond their usual region.`,
  },
  {
    id: 6,
    title: 'How We are Using 4K HDR to Enhance Your Viewing Experience',
    excerpt:
      'A technical exploration of how high-definition video formats are revolutionizing the way we experience film and television.',
    author: 'Priya Patel',
    date: 'March 28, 2025',
    readTime: '10 min',
    category: 'Technology',
    tags: ['4K', 'HDR', 'video quality'],
    image:
      'https://images.unsplash.com/photo-1577375729152-4c8b5fcda381?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    content: `HDR increases contrast headroom; 4K improves fine detail on larger screens. Together they reward good displays but demand solid bandwidth.

We encode variants so devices automatically step down gracefully instead of stalling playback.`,
  },
  {
    id: 7,
    title: 'Accessibility in Streaming: How PhimGG is Making Content Available to Everyone',
    excerpt:
      'Learn about our initiatives to make streaming more accessible through subtitles, audio descriptions, interface design, and more.',
    author: 'Sam Taylor',
    date: 'March 20, 2025',
    readTime: '8 min',
    category: 'Company',
    tags: ['accessibility', 'inclusion', 'features'],
    image:
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    content: `Accessibility means predictable controls, readable typography, and subtitle timing you can trust. We treat those as features, not extras.

Feedback from viewers helps prioritize upgrades—keep sending suggestions via Contact when something blocks your flow.`,
  },
  {
    id: 8,
    title: 'PhimGG Mobile: Tips and Tricks for Streaming On-the-Go',
    excerpt:
      'Get the most out of our mobile app with these expert tips for offline downloads, data usage, and mobile-specific features.',
    author: 'Lin Wei',
    date: 'March 15, 2025',
    readTime: '6 min',
    category: 'Guides',
    tags: ['mobile', 'app', 'downloads'],
    image:
      'https://images.unsplash.com/photo-1585399000684-d2f72660f092?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1471&q=80',
    content: `On mobile, prefer Wi‑Fi for first episodes—once playback is smooth, you can decide if cellular quality fits your commute.

Lower brightness saves battery; closed captions help on noisy trains without cranking volume.`,
  },
];

export function getBlogPostById(id: number): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.id === id);
}
