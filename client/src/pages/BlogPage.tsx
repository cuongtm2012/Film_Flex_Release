import React, { useState } from "react";
import { 
  BookOpen, 
  Calendar, 
  User, 
  Tag, 
  Clock, 
  Search, 
  ArrowRight,
  Film,
  Tv,
  Lightbulb,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: "Entertainment" | "Technology" | "Company" | "Guides";
  tags: string[];
  image: string;
  featured?: boolean;
}

const BlogPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const blogPosts: BlogPost[] = [
    {
      id: 1,
      title: "The Evolution of Streaming: From DVD Rentals to AI-Powered Recommendations",
      excerpt: "Explore the fascinating journey of how streaming technology has transformed from its humble beginnings to the sophisticated, personalized experience we enjoy today.",
      author: "Alex Johnson",
      date: "April 28, 2025",
      readTime: "8 min",
      category: "Technology",
      tags: ["streaming", "technology", "AI", "history"],
      image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80",
      featured: true
    },
    {
      id: 2,
      title: "Behind the Scenes: How FilmFlex Curates Content for Global Audiences",
      excerpt: "Get an exclusive look at our content curation process and how we ensure diverse, quality entertainment for viewers worldwide.",
      author: "Samantha Lee",
      date: "April 22, 2025",
      readTime: "6 min",
      category: "Company",
      tags: ["curation", "global", "content"],
      image: "https://images.unsplash.com/photo-1540224871915-bc8ffb782bdf?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1374&q=80",
      featured: true
    },
    {
      id: 3,
      title: "10 Hidden Gems You Need to Stream This Weekend",
      excerpt: "Discover critically acclaimed but lesser-known films and shows that deserve a spot on your watchlist.",
      author: "Marcus Chen",
      date: "April 15, 2025",
      readTime: "5 min",
      category: "Entertainment",
      tags: ["recommendations", "movies", "tv shows"],
      image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1425&q=80"
    },
    {
      id: 4,
      title: "Maximize Your Streaming Experience: Tips for the Perfect Movie Night",
      excerpt: "From audio setup to lighting and snacks, here's everything you need to create the ultimate home theater experience.",
      author: "Olivia Rodriguez",
      date: "April 10, 2025",
      readTime: "7 min",
      category: "Guides",
      tags: ["home theater", "tips", "streaming quality"],
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
    },
    {
      id: 5,
      title: "The Rise of International Content and Why It Matters",
      excerpt: "How global storytelling is breaking language barriers and bringing diverse perspectives to mainstream entertainment.",
      author: "Jamal Washington",
      date: "April 5, 2025",
      readTime: "9 min",
      category: "Entertainment",
      tags: ["international", "diversity", "global"],
      image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
    },
    {
      id: 6,
      title: "How We're Using 4K HDR to Enhance Your Viewing Experience",
      excerpt: "A technical exploration of how high-definition video formats are revolutionizing the way we experience film and television.",
      author: "Priya Patel",
      date: "March 28, 2025",
      readTime: "10 min",
      category: "Technology",
      tags: ["4K", "HDR", "video quality"],
      image: "https://images.unsplash.com/photo-1577375729152-4c8b5fcda381?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
    },
    {
      id: 7,
      title: "Accessibility in Streaming: How FilmFlex is Making Content Available to Everyone",
      excerpt: "Learn about our initiatives to make streaming more accessible through subtitles, audio descriptions, interface design, and more.",
      author: "Sam Taylor",
      date: "March 20, 2025",
      readTime: "8 min",
      category: "Company",
      tags: ["accessibility", "inclusion", "features"],
      image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
    },
    {
      id: 8,
      title: "FilmFlex Mobile: Tips and Tricks for Streaming On-the-Go",
      excerpt: "Get the most out of our mobile app with these expert tips for offline downloads, data usage, and mobile-specific features.",
      author: "Lin Wei",
      date: "March 15, 2025",
      readTime: "6 min",
      category: "Guides",
      tags: ["mobile", "app", "downloads"],
      image: "https://images.unsplash.com/photo-1585399000684-d2f72660f092?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1471&q=80"
    }
  ];

  const filteredPosts = blogPosts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const featuredPosts = blogPosts.filter(post => post.featured);
  
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Entertainment':
        return <Film className="h-4 w-4" />;
      case 'Technology':
        return <Tv className="h-4 w-4" />;
      case 'Company':
        return <BookOpen className="h-4 w-4" />;
      case 'Guides':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header section */}
      <div className="text-center mb-12">
        <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-3">FilmFlex Blog</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Insights, guides, and stories from the world of streaming entertainment.
        </p>
      </div>

      {/* Featured posts */}
      {featuredPosts.length > 0 && (
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Featured Articles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredPosts.map(post => (              <Card key={post.id} className="overflow-hidden border-gray-800 bg-black/20 h-full flex flex-col">
                <div className="relative h-60 overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="flex items-center gap-1 bg-black/70 hover:bg-black/70 text-white">
                      {getCategoryIcon(post.category)}
                      {post.category}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span>{post.date}</span>
                    <span className="mx-2">•</span>
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    <span>{post.readTime} read</span>
                  </div>
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground">{post.excerpt}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="flex items-center">
                    <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{post.author}</span>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-primary">
                    <a href={`/blog/posts/${post.id}`} className="flex items-center">
                      Read More <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search blog posts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs defaultValue="all" className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="entertainment" className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" /> Entertainment
              </TabsTrigger>
              <TabsTrigger value="technology" className="flex items-center gap-1">
                <Tv className="h-3.5 w-3.5" /> Technology
              </TabsTrigger>
              <TabsTrigger value="company" className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> Company
              </TabsTrigger>
              <TabsTrigger value="guides" className="flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" /> Guides
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Blog post grid */}
      <div className="mb-16">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">Try adjusting your search or browse all posts</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map(post => (              <Card key={post.id} className="overflow-hidden border-gray-800 bg-black/20 h-full flex flex-col">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="flex items-center gap-1 bg-black/70 hover:bg-black/70 text-white">
                      {getCategoryIcon(post.category)}
                      {post.category}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span>{post.date}</span>
                    <span className="mx-2">•</span>
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    <span>{post.readTime} read</span>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground text-sm line-clamp-3">{post.excerpt}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="flex items-center">
                    <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{post.author}</span>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-primary">
                    <a href={`/blog/posts/${post.id}`} className="flex items-center">
                      Read <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Categories section */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="border-gray-800 bg-gradient-to-br from-red-900/30 to-red-800/10 hover:border-red-700/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-full bg-red-900/20 flex items-center justify-center mb-4">
                <Film className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Entertainment</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Reviews, recommendations, and trends in movies and TV shows
              </p>
              <Button asChild variant="outline" size="sm">
                <a href="/blog/category/entertainment">View Articles</a>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-gray-800 bg-gradient-to-br from-blue-900/30 to-blue-800/10 hover:border-blue-700/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-full bg-blue-900/20 flex items-center justify-center mb-4">
                <Tv className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Technology</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Innovations and insights into streaming technology
              </p>
              <Button asChild variant="outline" size="sm">
                <a href="/blog/category/technology">View Articles</a>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-gray-800 bg-gradient-to-br from-green-900/30 to-green-800/10 hover:border-green-700/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-full bg-green-900/20 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Company</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Updates and stories from behind the scenes at FilmFlex
              </p>
              <Button asChild variant="outline" size="sm">
                <a href="/blog/category/company">View Articles</a>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-gray-800 bg-gradient-to-br from-yellow-900/30 to-yellow-800/10 hover:border-yellow-700/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-full bg-yellow-900/20 flex items-center justify-center mb-4">
                <Lightbulb className="h-6 w-6 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Guides</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tips and tutorials to enhance your streaming experience
              </p>
              <Button asChild variant="outline" size="sm">
                <a href="/blog/category/guides">View Articles</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Popular tags */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Popular Tags</h2>
        
        <div className="flex flex-wrap gap-3">
          {['streaming', 'movies', 'tv shows', 'technology', 'recommendations', 'international', '4K', 'HDR', 'mobile', 'app', 'features', 'content', 'curation'].map((tag, index) => (
            <Badge key={index} variant="outline" className="text-sm py-1.5 px-3 hover:bg-primary/10 cursor-pointer">
              # {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Subscribe section */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg p-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-3">Stay Updated</h2>
            <p className="text-muted-foreground mb-6">
              Subscribe to our newsletter to receive the latest articles, industry insights, and FilmFlex updates directly in your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                placeholder="Enter your email" 
                type="email"
                className="sm:max-w-xs"
              />
              <Button>Subscribe</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              By subscribing, you agree to our Privacy Policy. You can unsubscribe at any time.
            </p>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="relative">
              <div className="absolute -top-10 -left-8 bg-primary/20 rounded-full h-32 w-32"></div>
              <div className="absolute -right-10 -bottom-10 bg-primary/30 rounded-full h-28 w-28"></div>
              <div className="relative z-10 bg-black/30 p-5 rounded-lg">
                <Smartphone className="h-10 w-10 text-primary mb-3" />
                <h3 className="text-lg font-semibold mb-1">Blog on the Go</h3>
                <p className="text-sm text-muted-foreground">
                  Access our blog articles anytime, anywhere with the FilmFlex mobile app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent articles */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Recent Articles</h2>
          <Button asChild variant="outline">
            <a href="/blog/archive">View All</a>
          </Button>
        </div>
        
        <div className="space-y-5">
          {blogPosts.slice(0, 5).map(post => (
            <div key={post.id} className="border-b border-gray-800 pb-5">              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-1/4 h-32 md:h-auto">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover rounded-md"
                    loading="lazy"
                  />
                </div>
                <div className="md:w-3/4">
                  <div className="flex items-center mb-2">
                    <Badge variant="outline" className="mr-2">{post.category}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {post.date}
                    </span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {post.readTime} read
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{post.excerpt}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {post.author}
                    </span>
                    <Button asChild variant="ghost" size="sm" className="text-primary">
                      <a href={`/blog/posts/${post.id}`} className="flex items-center">
                        Read Article <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;