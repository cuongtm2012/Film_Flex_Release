import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { MovieListResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Newspaper, 
  PlayCircle, 
  Star, 
  Film, 
  Users, 
  Globe, 
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, Link } from "wouter";
import { Helmet } from 'react-helmet-async';

// SEO Content Section Component - Moved from Home page and adapted for News & Popular
function SEOContentSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-background to-background/80" aria-labelledby="seo-main-heading">
      <div className="container mx-auto px-4">
        {/* Main H1 heading for SEO */}
        <header className="text-center mb-12">
          <h1 id="seo-main-heading" className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Latest Movie News & Popular Content
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto">
            Stay updated with the latest movie news, reviews, trailers, and discover the most popular films and TV shows. 
            Your ultimate destination for entertainment news and trending content on PhimGG.com.
          </p>
        </header>

        {/* Feature highlights with internal links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <article className="text-center p-6 bg-black/20 rounded-lg">
            <Newspaper className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-3">Breaking News</h2>
            <p className="text-muted-foreground mb-4">
              Get the latest updates on upcoming releases, industry news, celebrity interviews, and behind-the-scenes content. 
              Stay informed about everything happening in the entertainment world.
            </p>
            <Link href="/news">
              <Button variant="outline" className="w-full">
                <ArrowRight className="mr-2 h-4 w-4" />
                Read Latest News
              </Button>
            </Link>
          </article>
          
          <article className="text-center p-6 bg-black/20 rounded-lg">
            <Star className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-3">Reviews & Ratings</h2>
            <p className="text-muted-foreground mb-4">
              Discover expert reviews and user ratings for the latest movies and TV shows. Make informed viewing decisions 
              with our comprehensive review system and community feedback.
            </p>
            <Link href="/reviews">
              <Button variant="outline" className="w-full">
                <Star className="mr-2 h-4 w-4" />
                Browse Reviews
              </Button>
            </Link>
          </article>
          
          <article className="text-center p-6 bg-black/20 rounded-lg">
            <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-3">Trending Content</h2>
            <p className="text-muted-foreground mb-4">
              Explore what's trending right now. From viral movie moments to popular TV series discussions, 
              discover what the community is watching and talking about.
            </p>
            <Link href="/trending">
              <Button variant="outline" className="w-full">
                <TrendingUp className="mr-2 h-4 w-4" />
                See What's Trending
              </Button>
            </Link>
          </article>
        </div>

        {/* Platform highlights section */}
        <div className="bg-black/30 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Why PhimGG for News & Entertainment?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Comprehensive Coverage</h3>
              <p className="text-muted-foreground mb-4">
                Our dedicated team brings you comprehensive coverage of the entertainment industry. From exclusive interviews 
                to first-look trailers, we keep you connected to the world of movies and television.
              </p>
              <p className="text-muted-foreground mb-4">
                We cover everything from Hollywood blockbusters to independent films, international cinema, and streaming exclusives, 
                ensuring you never miss the latest entertainment news.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Community-Driven Content</h3>
              <p className="text-muted-foreground mb-4">
                Join a vibrant community of movie enthusiasts who share reviews, discussions, and recommendations. 
                Our platform combines professional journalism with authentic user-generated content.
              </p>
              <div className="flex items-center gap-6 mt-6">
                <div className="text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="font-semibold">25K+</div>
                  <div className="text-sm text-muted-foreground">Active Readers</div>
                </div>
                <div className="text-center">
                  <Newspaper className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="font-semibold">500+</div>
                  <div className="text-sm text-muted-foreground">Articles Monthly</div>
                </div>
                <div className="text-center">
                  <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="font-semibold">1000+</div>
                  <div className="text-sm text-muted-foreground">Reviews</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation links for better internal linking */}
        <nav className="text-center" aria-label="Content categories">
          <h3 className="text-2xl font-semibold mb-6">Explore Content Categories</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/news/movie-releases">
              <Button variant="secondary">
                <Film className="mr-2 h-4 w-4" />
                Movie Releases
              </Button>
            </Link>
            <Link href="/news/tv-shows">
              <Button variant="secondary">
                <PlayCircle className="mr-2 h-4 w-4" />
                TV Show News
              </Button>
            </Link>
            <Link href="/news/celebrity">
              <Button variant="secondary">
                <Users className="mr-2 h-4 w-4" />
                Celebrity News
              </Button>
            </Link>
            <Link href="/news/industry">
              <Button variant="secondary">
                <Globe className="mr-2 h-4 w-4" />
                Industry Updates
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </section>
  );
}

// Placeholder news articles (in a real app, this would come from an API)
const newsArticles = [
  {
    id: 1,
    title: "Top 10 Films to Watch This Summer",
    excerpt: "Summer is here, and with it comes a wave of must-see blockbusters and independent gems...",
    date: "May 1, 2025",
    category: "news",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1450&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "Review: The Latest Thriller Everyone's Talking About",
    excerpt: "The new psychological thriller that has audiences on the edge of their seats...",
    date: "April 28, 2025",
    category: "review",
    image: "https://images.unsplash.com/photo-1518929458113-94d07e1aaf46?q=80&w=1446&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "Upcoming Releases: What to Expect Next Month",
    excerpt: "A look ahead at the most anticipated films coming to theaters and streaming platforms...",
    date: "April 25, 2025",
    category: "news",
    image: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1374&auto=format&fit=crop"
  },
  {
    id: 4,
    title: "Trailer: First Look at the New Sci-Fi Epic",
    excerpt: "The first trailer for the highly anticipated sci-fi film has just dropped...",
    date: "April 20, 2025",
    category: "trailer",
    image: "https://images.unsplash.com/photo-1596727147705-61a532a659bd?q=80&w=1374&auto=format&fit=crop"
  },
  {
    id: 5,
    title: "Interview with Award-Winning Director",
    excerpt: "We sit down with the acclaimed director to discuss their latest project...",
    date: "April 15, 2025",
    category: "news",
    image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1470&auto=format&fit=crop"
  }
];

export default function NewsPage() {
  const [, setLocation] = useLocation();
  
  // Fetch popular movies
  const { data: popularMovies, isLoading } = useQuery<MovieListResponse>({
    queryKey: ["/api/movies", { page: 1, limit: 12 }],
  });

  const handleMovieClick = (movieSlug: string) => {
    setLocation(`/movie/${movieSlug}`);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "news":
        return <Newspaper className="h-4 w-4" />;
      case "review":
        return <Star className="h-4 w-4" />;
      case "trailer":
        return <PlayCircle className="h-4 w-4" />;
      default:
        return <Newspaper className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Latest Movie News & Popular Content | PhimGG</title>
        <meta name="description" content="Stay updated with the latest movie news, reviews, trailers, and discover popular films and TV shows. Your entertainment news destination on PhimGG." />
        <meta name="keywords" content="movie news, film reviews, movie trailers, popular movies, entertainment news, PhimGG news, latest releases" />
        <link rel="canonical" href="https://phimgg.com/news" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Latest Movie News & Popular Content | PhimGG" />
        <meta property="og:description" content="Stay updated with the latest movie news, reviews, trailers, and discover popular films and TV shows." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://phimgg.com/news" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Latest Movie News & Popular Content | PhimGG" />
        <meta name="twitter:description" content="Stay updated with the latest movie news, reviews, trailers, and discover popular films and TV shows." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* SEO Content Section */}
        <SEOContentSection />

        {/* Main Content Container */}
        <main className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Newspaper className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">News & Popular</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Discover the latest entertainment news, reviews, and trending content in the world of movies and television.
            </p>
          </header>
          
          {/* News Section */}
          <section aria-labelledby="news-section" className="mb-12">
            <Tabs defaultValue="all" className="mb-8">
              <TabsList className="mb-6 w-full justify-start">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  All News
                </TabsTrigger>
                <TabsTrigger value="news" className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  Latest News
                </TabsTrigger>
                <TabsTrigger value="reviews" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Reviews
                </TabsTrigger>
                <TabsTrigger value="trailers" className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Trailers
                </TabsTrigger>
              </TabsList>
        
        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsArticles.map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="flex items-center gap-1">
                      {getCategoryIcon(article.category)}
                      <span className="capitalize">{article.category}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                  </div>
                  <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {article.excerpt}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    Read more <Eye className="ml-1 h-4 w-4" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="news">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsArticles.filter(a => a.category === 'news').map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="flex items-center gap-1">
                      <Newspaper className="h-4 w-4" />
                      <span>News</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                  </div>
                  <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {article.excerpt}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    Read more <Eye className="ml-1 h-4 w-4" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="reviews">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsArticles.filter(a => a.category === 'review').map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>Review</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                  </div>
                  <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {article.excerpt}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    Read more <Eye className="ml-1 h-4 w-4" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="trailers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsArticles.filter(a => a.category === 'trailer').map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="flex items-center gap-1">
                      <PlayCircle className="h-4 w-4" />
                      <span>Trailer</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                  </div>
                  <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {article.excerpt}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    Watch trailer <Eye className="ml-1 h-4 w-4" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      <Separator className="my-8" />
            </section>

          {/* Popular Movies Section */}
          <section aria-labelledby="popular-movies" className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 id="popular-movies" className="text-2xl font-bold">Popular Movies</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {isLoading ? (
                // Loading skeletons
                Array(10).fill(0).map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : (
                // Movie cards
                popularMovies?.items.slice(0, 10).map((movie: any, idx: number) => (
                  <div key={idx} className="overflow-hidden rounded-lg">
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => handleMovieClick(movie.slug)}
                    >
                      <img 
                        src={movie.thumbUrl || '/placeholder-poster.jpg'} 
                        alt={movie.name} 
                        className="w-full aspect-[2/3] object-cover rounded-lg transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <PlayCircle className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          #{idx + 1}
                        </Badge>
                      </div>
                    </div>
                    <h3 
                      className="mt-2 font-medium line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleMovieClick(movie.slug)}
                    >
                      {movie.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{movie.year}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}