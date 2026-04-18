import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { MovieListResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Newspaper,
  PlayCircle,
  Star,
  TrendingUp
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { NEWS_ARTICLES } from "@shared/seo-static";
import { PageSEO } from "@/components/PageSEO";

export default function NewsPage() {
  const { data: popularMovies, isLoading } = useQuery<MovieListResponse>({
    queryKey: ["/api/movies", { page: 1, limit: 12 }],
  });

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
      <PageSEO
        title="Tin phim & nội dung nổi bật"
        description="Cập nhật tin điện ảnh, review, trailer và các bộ phim đang được quan tâm trên PhimGG."
        canonical="/news"
        keywords="tin phim, review phim, trailer, PhimGG"
      />

      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Newspaper className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">News & Popular</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Discover the latest entertainment news, reviews, and trending content in the world of movies and television.
            </p>
          </header>

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
                  {NEWS_ARTICLES.map((article) => (
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
                        <CardDescription className="line-clamp-3">{article.excerpt}</CardDescription>
                      </CardContent>
                      <CardFooter>
                        <Link
                          href={`/news/${article.slug}`}
                          className="text-primary hover:underline flex items-center"
                        >
                          Read more <Eye className="ml-1 h-4 w-4" />
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="news">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {NEWS_ARTICLES.filter((a) => a.category === "news").map((article) => (
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
                        <CardDescription className="line-clamp-3">{article.excerpt}</CardDescription>
                      </CardContent>
                      <CardFooter>
                        <Link
                          href={`/news/${article.slug}`}
                          className="text-primary hover:underline flex items-center"
                        >
                          Read more <Eye className="ml-1 h-4 w-4" />
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {NEWS_ARTICLES.filter((a) => a.category === "review").map((article) => (
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
                        <CardDescription className="line-clamp-3">{article.excerpt}</CardDescription>
                      </CardContent>
                      <CardFooter>
                        <Link
                          href={`/news/${article.slug}`}
                          className="text-primary hover:underline flex items-center"
                        >
                          Read more <Eye className="ml-1 h-4 w-4" />
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="trailers">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {NEWS_ARTICLES.filter((a) => a.category === "trailer").map((article) => (
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
                        <CardDescription className="line-clamp-3">{article.excerpt}</CardDescription>
                      </CardContent>
                      <CardFooter>
                        <Link
                          href={`/news/${article.slug}`}
                          className="text-primary hover:underline flex items-center"
                        >
                          Watch trailer <Eye className="ml-1 h-4 w-4" />
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-8" />
          </section>

          <section aria-labelledby="popular-movies" className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 id="popular-movies" className="text-2xl font-bold">Popular Movies</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {isLoading
                ? Array(10)
                    .fill(0)
                    .map((_, idx) => (
                      <div key={idx} className="space-y-2">
                        <Skeleton className="h-[200px] w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))
                : popularMovies?.items.slice(0, 10).map((movie: any, idx: number) => (
                    <div key={idx} className="overflow-hidden rounded-lg">
                      <Link href={`/movie/${movie.slug}`} className="block">
                        <div className="relative group">
                          <img
                            src={
                              movie.thumb_url ||
                              movie.thumbUrl ||
                              movie.poster_url ||
                              movie.posterUrl ||
                              "/placeholder-poster.jpg"
                            }
                            alt={movie.name}
                            className="w-full aspect-[2/3] object-cover rounded-lg transition-transform group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== "/placeholder-poster.jpg") {
                                target.src = "/placeholder-poster.jpg";
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
                        <h3 className="mt-2 font-medium line-clamp-1 hover:text-primary transition-colors">
                          {movie.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{movie.year}</p>
                      </Link>
                    </div>
                  ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
