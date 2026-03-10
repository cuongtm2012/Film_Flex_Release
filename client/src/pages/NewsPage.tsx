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
        <link rel="canonical" href="https://phimgg.com/news/" />
        
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">            {newsArticles.map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    loading="lazy"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">            {newsArticles.filter(a => a.category === 'news').map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    loading="lazy"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">            {newsArticles.filter(a => a.category === 'review').map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    loading="lazy"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">            {newsArticles.filter(a => a.category === 'trailer').map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    loading="lazy"
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
                  <div key={idx} className="overflow-hidden rounded-lg">                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => handleMovieClick(movie.slug)}
                    >
                      <img 
                        src={movie.thumb_url || movie.thumbUrl || movie.poster_url || movie.posterUrl || '/placeholder-poster.jpg'} 
                        alt={movie.name} 
                        className="w-full aspect-[2/3] object-cover rounded-lg transition-transform group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== '/placeholder-poster.jpg') {
                            target.src = '/placeholder-poster.jpg';
                          }
                        }}
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