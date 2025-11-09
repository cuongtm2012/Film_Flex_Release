import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { MovieListResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// This is an extended type for the movie with all fields
// We don't need to augment the original type as we're using casting

// Define type for category and country objects
interface CategoryObject {
  id?: string | number;
  name: string;
  slug?: string;
  [key: string]: any; // For any other properties
}

type CategoryType = string | CategoryObject;

// Extended type for movie objects with additional fields
interface MovieDetailsType {
  _id: string;
  id: number;
  name: string;
  slug: string;
  origin_name?: string;
  content?: string;
  type?: string;
  status?: string;
  thumb_url?: string;
  poster_url?: string;
  is_copyright?: boolean;
  sub_docquyen?: boolean;
  chieurap?: boolean;
  time?: string;
  episode_current?: string;
  episode_total?: string;
  quality?: string;
  lang?: string;
  notify?: string;
  showtimes?: string;
  year?: string;
  view?: number;
  actor?: CategoryType[];
  director?: CategoryType[];  category?: CategoryType[];
  country?: CategoryType[];
  countries?: string[];
  episodes?: any[];
  isRecommended?: boolean;
  active?: boolean;
  created?: {
    time: string;
  };
  modified?: {
    time: string;
  };
  tmdb?: {
    id?: number;
    type?: string;
  };
  section?: string;
}
import UserManagement from "@/components/admin/UserManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowUpDown,
  Edit,
  Upload,
  AlertCircle
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";



export default function AdminPage() {  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // State for pagination and filters
  const [currentPage, setCurrentPage] = useState(1);  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendedFilter, setRecommendedFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // State for system settings tabs
  const [systemSettingsTab, setSystemSettingsTab] = useState("general");
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // State for movie editing
  const [fullScreenEdit, setFullScreenEdit] = useState(false);
  const [currentEditMovie, setCurrentEditMovie] = useState<MovieDetailsType | null>(null);
  const [isLoadingMovieDetails, setIsLoadingMovieDetails] = useState(false);

  // Constants
  const itemsPerPage = 10;
  const navigate = useLocation()[1];
  const [activeTab, setActiveTab] = useState('content-management');
  
  // Add isAuthenticated variable to fix undefined error
  const isAuthenticated = !!user;
  
  // Fetch system settings
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/admin/settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      return data.data;
    },
    enabled: isAuthenticated && activeTab === 'system-settings',
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Update local state when settings are loaded
  useEffect(() => {
    if (settingsData) {
      setSystemSettings(settingsData);
    }
  }, [settingsData]);
  
  // Function to save system settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemSettings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      await response.json(); // Consume response
      
      toast({
        description: "Settings saved successfully",
      });
      
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };
  
  // Function to update a setting value
  const updateSetting = (key: string, value: any) => {
    setSystemSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Function to fetch full movie details
  const fetchMovieDetails = async (slug: string) => {
    setIsLoadingMovieDetails(true);
    try {
      // Create a cache-busting URL with timestamp and a random string
      // to ensure we get fresh data every time
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const url = `/api/movies/${slug}?_t=${timestamp}&r=${randomStr}&clear_cache=true`;
      
      logger.log(`Fetching movie details from: ${url}`);
      const response = await fetch(url, {
        cache: 'no-store', // Tell browser to never use cache 
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch movie details");
      }
      
      const data = await response.json();
      
      // Check if response has movie data - it could be in a few different formats
      // depending on the API implementation
      const movieData = data.movie || (data.status !== false && data);
      
      if (!movieData) {
        throw new Error("Invalid or missing movie data");
      }
      
      logger.log("Raw movie data from API:", movieData);
      
      // Ensure we have proper default values for section and isRecommended
      const formattedMovie = {
        ...movieData,
        // Convert null/undefined section to "none" for the UI dropdown
        section: movieData.section || "none", 
        // Ensure isRecommended is a boolean - use strict equality
        isRecommended: movieData.isRecommended === true 
      };
      
      logger.log("Fetched movie data:", movieData);
      logger.log("Formatted movie for editing:", {
        section: formattedMovie.section,
        isRecommended: formattedMovie.isRecommended
      });
        // Store the formatted movie in state
      setCurrentEditMovie(formattedMovie);

      setIsLoadingMovieDetails(false);
    } catch (error) {
      logger.error("Error fetching movie details:", error);      toast({
        variant: "destructive",
        title: "Error",
        description: `Error fetching movie details: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setIsLoadingMovieDetails(false);
    }
  };    // Function to handle movie save
    const handleMovieSave = async () => {
    if (!currentEditMovie) return;
    
    try {
      setIsLoadingMovieDetails(true);
      
      // Prepare a minimal payload with only the fields we want to update
      const payload = {        name: currentEditMovie.name,
        slug: currentEditMovie.slug,
        type: currentEditMovie.type || 'single',
        status: currentEditMovie.status || 'ongoing',
        // Handle section explicitly - if "none" is selected, set to null
        section: currentEditMovie.section === 'none' ? null : currentEditMovie.section,
        isRecommended: Boolean(currentEditMovie.isRecommended),
        // Convert year to number if it's numeric, otherwise null
        year: currentEditMovie.year ? Number(currentEditMovie.year) || null : null,
        episode_current: currentEditMovie.episode_current || null,
        episode_total: currentEditMovie.episode_total || null
      };
      
      const response = await fetch(`/api/movies/${currentEditMovie.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update movie';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Use default error message if we can't parse the error response
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.message || 'Failed to update movie');
      }

      // Show success message
      toast({
        description: "Movie details updated successfully",
      });
      
      // Refresh data and close dialog
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: [`/api/movies/${currentEditMovie.slug}`] });
      setFullScreenEdit(false);
      
    } catch (error) {
      logger.error('Error updating movie:', error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to update movie details. Please try again.",
      });    } finally {
      setIsLoadingMovieDetails(false);
    }
  };
  
  // Fetch real movie data
  const { data: moviesData, isLoading: isLoadingMovies, error: moviesError } = useQuery({
    queryKey: ["/api/movies", currentPage, sectionFilter, recommendedFilter, typeFilter, searchQuery, itemsPerPage],
    queryFn: async () => {
      // Construct base query parameters
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage)
      });
      
      // Add filter parameters
      if (sectionFilter !== "all") {
        params.append("section", sectionFilter);
      }
      
      if (recommendedFilter === "yes") {
        params.append("isRecommended", "true");
      } else if (recommendedFilter === "no") {
        params.append("isRecommended", "false");
      }
        if (typeFilter !== "all") {
        // Map frontend type values to backend database values
        if (typeFilter === "movie") {
          params.append("type", "single");
        } else if (typeFilter === "series") {
          params.append("type", "series");
        } else if (typeFilter === "anime") {
          params.append("type", "hoathinh");
        }
      }
      
      let url: string;
      
      // If there are no specific filters active and we're on the content management tab,
      // use the admin endpoint to fetch all movies by default
      if (activeTab === "content-management" && 
          !searchQuery.trim() && 
          sectionFilter === "all" && 
          recommendedFilter === "all" && 
          typeFilter === "all") {
        
        url = `/api/admin/movies?${params.toString()}`;
        logger.log(`Fetching all movies from admin endpoint: ${url}`);
      } else if (searchQuery.trim()) {
        // If search query exists, use full-text search across multiple fields
        params.append("q", searchQuery.trim());
        params.append("fields", "name,origin_name,content,description,actor,director,category,country");
        url = `/api/search?${params.toString()}`;
        logger.log(`Searching movies with filters: ${url}`);
      } else {
        // Use admin endpoint with filters for content management
        url = `/api/admin/movies?${params.toString()}`;
        logger.log(`Fetching filtered movies from admin endpoint: ${url}`);
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch movies");
      }
      
      return await response.json() as MovieListResponse;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });


  // Mock data for audit logs
  const mockAuditLogs = [
    { id: 1, user: "admin", action: "USER_CREATE", details: "Created new moderator account", timestamp: "2023-12-25 09:15", ip: "192.168.1.1" },
    { id: 2, user: "moderator1", action: "CONTENT_APPROVE", details: "Approved movie 'Interstellar'", timestamp: "2023-12-24 14:30", ip: "192.168.1.2" },
    { id: 3, user: "admin", action: "SETTING_CHANGE", details: "Updated system email template", timestamp: "2023-12-24 10:45", ip: "192.168.1.1" },
    { id: 4, user: "admin", action: "USER_SUSPEND", details: "Suspended user 'bad_actor123'", timestamp: "2023-12-23 16:20", ip: "192.168.1.1" },
    { id: 5, user: "moderator1", action: "CONTENT_DELETE", details: "Deleted inappropriate comment", timestamp: "2023-12-22 11:35", ip: "192.168.1.2" },
  ];

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-20 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="mb-4">You don't have permission to access the admin panel.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        {/* Admin Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onBackToSite={() => navigate("/")}
        />

        {/* Main Content Area */}
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </header>

          <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* User Management */}
          {activeTab === "user-management" && (
            <>
              <UserManagement />
            </>
          )}

          {/* Content Management */}
          {activeTab === "content-management" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Content Management</CardTitle>
                  <CardDescription>Manage movies, series, and other content on the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Options */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search across titles, description, actors, directors, categories..." 
                        className="pl-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">                      <Button variant="outline" onClick={() => {
                        // Reset filters
                        setSectionFilter("all");
                        setRecommendedFilter("all");
                        setTypeFilter("all");
                        setSearchQuery("");
                        setCurrentPage(1);
                      }} className="flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        Reset Filters
                      </Button>
                      <Button onClick={() => setCurrentPage(1)}>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </Button>
                    </div>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Content
                    </Button>
                  </div>                  {/* Advanced Filter Panel */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-md mb-4">
                    <div>
                      <Label htmlFor="section-filter" className="text-sm font-medium block mb-2">
                        Section
                      </Label>
                      <Select 
                        defaultValue="all" 
                        value={sectionFilter}
                        onValueChange={(value) => setSectionFilter(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="all-sections" value="all">All Sections</SelectItem>
                          <SelectItem key="trending" value="trending_now">Trending Now</SelectItem>
                          <SelectItem key="latest" value="latest_movies">Latest Movies</SelectItem>
                          <SelectItem key="top-rated" value="top_rated">Top Rated Movies</SelectItem>
                          <SelectItem key="popular-tv" value="popular_tv">Popular TV Series</SelectItem>
                          <SelectItem key="anime" value="anime">Anime</SelectItem>
                          <SelectItem key="none-section" value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="recommended-filter" className="text-sm font-medium block mb-2">
                        Recommended
                      </Label>
                      <Select 
                        defaultValue="all" 
                        value={recommendedFilter}
                        onValueChange={(value) => setRecommendedFilter(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Recommendation status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="all-rec" value="all">All</SelectItem>
                          <SelectItem key="yes-rec" value="yes">Recommended</SelectItem>
                          <SelectItem key="no-rec" value="no">Not Recommended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="type-filter" className="text-sm font-medium block mb-2">
                        Type
                      </Label>
                      <Select 
                        defaultValue="all" 
                        value={typeFilter}
                        onValueChange={(value) => setTypeFilter(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>                        <SelectContent>
                          <SelectItem key="all-types" value="all">All Types</SelectItem>
                          <SelectItem key="movie-type" value="movie">Movies</SelectItem>
                          <SelectItem key="series-type" value="series">TV Series</SelectItem>
                          <SelectItem key="anime-type" value="anime">Anime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {isLoadingMovies ? (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading content data...
                      </div>
                    ) : moviesError ? (
                      <div className="py-8 text-center text-destructive">
                        Error loading content data. Please try again.
                      </div>
                    ) : (
                      <table className="w-full border-collapse">                        <thead>                          <tr className="border-b">
                            <th className="py-3 px-2 text-left font-medium">ID</th>
                            <th className="py-3 px-2 text-left font-medium">
                              <div className="flex items-center gap-1 cursor-pointer">
                                Title
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </th>
                            <th className="py-3 px-2 text-left font-medium">Section</th>
                            <th className="py-3 px-2 text-center font-medium">Recommend</th>
                            <th className="py-3 px-2 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moviesData?.items.map((movie, index) => {
                            // Cast movie to the full type with all fields
                            const movieDetails = movie as unknown as MovieDetailsType;
                            // Use a reliable unique key combining multiple properties
                            const uniqueKey = `movie-${movieDetails.id || movieDetails._id || movieDetails.slug || index}`;
                            return (
                              <tr key={uniqueKey} className="border-b hover:bg-muted/10">                                <td className="py-4 px-2">{movieDetails.id || index + 1}</td>
                                <td className="py-4 px-2 font-medium">
                                  <div className="flex items-center">                                    {movieDetails.thumb_url && (
                                      <div className="w-8 h-12 mr-2 rounded overflow-hidden">
                                        <img 
                                          src={movieDetails.thumb_url} 
                                          alt={movieDetails.name} 
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      </div>
                                    )}
                                    <span>{movieDetails.name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-2">
                                  {(() => {
                                    // Convert section value to readable format
                                    if (!movieDetails.section) return 'None';
                                    
                                    const sectionNames = {
                                      'trending_now': 'Trending Now',
                                      'latest_movies': 'Latest Movies',
                                      'top_rated': 'Top Rated Movies',
                                      'popular_tv': 'Popular TV Series'
                                    };
                                    
                                    return sectionNames[movieDetails.section as keyof typeof sectionNames] || movieDetails.section;
                                  })()}
                                </td>                                <td className="py-4 px-2 text-center">
                                  <div className="flex justify-center">
                                    {movieDetails.isRecommended === true ? (
                                      <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                    ) : (
                                      <Star className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        // Set loading state first
                                        setIsLoadingMovieDetails(true);
                                        
                                        // Fetch movie details
                                        fetchMovieDetails(movieDetails.slug);
                                        
                                        // Open the edit dialog
                                        setFullScreenEdit(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                      Edit
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {moviesData?.pagination?.currentPage ?? 1} of {moviesData?.pagination?.totalPages ?? 1} pages
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, moviesData?.pagination?.totalPages ?? 1))}
                        disabled={currentPage === (moviesData?.pagination?.totalPages ?? 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* System Settings */}
          {activeTab === "system-settings" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure system-wide settings and preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Horizontal Tabs */}
                  <div className="border-b mb-6">
                    <div className="flex flex-wrap gap-2 -mb-px">
                      <Button
                        variant={systemSettingsTab === "general" ? "default" : "ghost"}
                        className="rounded-b-none"
                        onClick={() => setSystemSettingsTab("general")}
                      >
                        General Settings
                      </Button>
                      <Button
                        variant={systemSettingsTab === "branding" ? "default" : "ghost"}
                        className="rounded-b-none"
                        onClick={() => setSystemSettingsTab("branding")}
                      >
                        Branding
                      </Button>
                      <Button
                        variant={systemSettingsTab === "email" ? "default" : "ghost"}
                        className="rounded-b-none"
                        onClick={() => setSystemSettingsTab("email")}
                      >
                        Email Settings
                      </Button>
                      <Button
                        variant={systemSettingsTab === "security" ? "default" : "ghost"}
                        className="rounded-b-none"
                        onClick={() => setSystemSettingsTab("security")}
                      >
                        Security
                      </Button>
                      <Button
                        variant={systemSettingsTab === "analytics" ? "default" : "ghost"}
                        className="rounded-b-none"
                        onClick={() => setSystemSettingsTab("analytics")}
                      >
                        Analytics & API Keys
                      </Button>
                      <Button
                        variant={systemSettingsTab === "session" ? "default" : "ghost"}
                        className="rounded-b-none"
                        onClick={() => setSystemSettingsTab("session")}
                      >
                        Session & Other
                      </Button>
                      <Button
                        variant={systemSettingsTab === "sso" ? "default" : "ghost"}
                        className="rounded-b-none"
                        onClick={() => setSystemSettingsTab("sso")}
                      >
                        SSO Configuration
                      </Button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-4">
                    {/* General Settings Tab */}
                    {systemSettingsTab === "general" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                        <div>
                          <Label htmlFor="site-title" className="block text-sm font-medium mb-2">
                            Site Title
                          </Label>
                          <Input 
                            id="site-title"
                            placeholder="Enter the site title"
                            defaultValue="PhimGG Admin"
                          />
                        </div>
                        <div>
                          <Label htmlFor="site-url" className="block text-sm font-medium mb-2">
                            Site URL
                          </Label>
                          <Input 
                            id="site-url"
                            placeholder="Enter the site URL"
                            defaultValue="https://admin.filmflex.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="admin-email" className="block text-sm font-medium mb-2">
                            Admin Email
                          </Label>
                          <Input 
                            id="admin-email"
                            placeholder="Enter the admin email"
                            defaultValue="admin@filmflex.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="support-email" className="block text-sm font-medium mb-2">
                            Support Email
                          </Label>
                          <Input 
                            id="support-email"
                            placeholder="Enter the support email"
                            defaultValue="support@filmflex.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="site-description" className="block text-sm font-medium mb-2">
                            Site Description
                          </Label>
                          <Textarea 
                            id="site-description"
                            placeholder="Enter a brief description of the site"
                            defaultValue="A premier platform for watching and sharing films and TV shows."
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="site-keywords" className="block text-sm font-medium mb-2">
                            Site Keywords
                          </Label>
                          <Input 
                            id="site-keywords"
                            placeholder="Enter keywords separated by commas"
                            defaultValue="films, movies, tv shows, streaming"
                          />
                        </div>
                        <div>
                          <Label id="timezone-label" className="block text-sm font-medium mb-2">
                            Timezone
                          </Label>
                          <Select defaultValue="UTC" aria-labelledby="timezone-label">
                            <SelectTrigger aria-label="timezone">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="GMT">GMT</SelectItem>
                              <SelectItem value="CET">CET</SelectItem>
                              <SelectItem value="EST">EST</SelectItem>
                              <SelectItem value="PST">PST</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label id="language-label" className="block text-sm font-medium mb-2">
                            Language
                          </Label>
                          <Select defaultValue="en" aria-labelledby="language-label">
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="vi">Vietnamese</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label id="currency-label" className="block text-sm font-medium mb-2">
                            Currency
                          </Label>
                          <Select defaultValue="USD" aria-labelledby="currency-label">
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="JPY">JPY</SelectItem>
                              <SelectItem value="VND">VND</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label id="payment-gateway-label" className="block text-sm font-medium mb-2">
                            Payment Gateway
                          </Label>
                          <Select defaultValue="stripe" aria-labelledby="payment-gateway-label">
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment gateway" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="stripe">Stripe</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="square">Square</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Branding Tab */}
                    {systemSettingsTab === "branding" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4">Branding</h3>
                        <div>
                          <Label htmlFor="site-logo" className="block text-sm font-medium mb-2">
                            Site Logo
                          </Label>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-muted">
                                <span className="text-xl font-semibold">FL</span>
                              </AvatarFallback>
                            </Avatar>
                            <Button variant="outline" size="sm">
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Logo
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="favicon" className="block text-sm font-medium mb-2">
                            Favicon
                          </Label>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-muted">
                                <span className="text-xl font-semibold">F</span>
                              </AvatarFallback>
                            </Avatar>
                            <Button variant="outline" size="sm">
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Favicon
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Email Settings Tab */}
                    {systemSettingsTab === "email" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4">Email Settings</h3>
                        <div>
                          <Label htmlFor="email-smtp" className="block text-sm font-medium mb-2">
                            SMTP Server
                          </Label>
                          <Input 
                            id="email-smtp"
                            placeholder="Enter SMTP server address"
                            defaultValue="smtp.filmflex.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email-port" className="block text-sm font-medium mb-2">
                            SMTP Port
                          </Label>
                          <Input 
                            id="email-port"
                            placeholder="Enter SMTP server port"
                            defaultValue="587"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email-user" className="block text-sm font-medium mb-2">
                            SMTP Username
                          </Label>
                          <Input 
                            id="email-user"
                            placeholder="Enter SMTP username"
                            defaultValue="admin@filmflex.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email-pass" className="block text-sm font-medium mb-2">
                            SMTP Password
                          </Label>
                          <Input 
                            id="email-pass"
                            placeholder="Enter SMTP password"
                            defaultValue="********"
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email-from" className="block text-sm font-medium mb-2">
                            Email From Address
                          </Label>
                          <Input 
                            id="email-from"
                            placeholder="Enter the from address for emails"
                            defaultValue="no-reply@filmflex.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email-name" className="block text-sm font-medium mb-2">
                            Email From Name
                          </Label>
                          <Input 
                            id="email-name"
                            placeholder="Enter the from name for emails"
                            defaultValue="PhimGG Support"
                          />
                        </div>
                      </div>
                    )}

                    {/* Security Tab */}
                    {systemSettingsTab === "security" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4">Security</h3>
                        <div>
                          <Label htmlFor="recaptcha-site" className="block text-sm font-medium mb-2">
                            reCAPTCHA Site Key
                          </Label>
                          <Input 
                            id="recaptcha-site"
                            placeholder="Enter reCAPTCHA site key"
                            defaultValue="6Lc_aCQUAAAAA..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="recaptcha-secret" className="block text-sm font-medium mb-2">
                            reCAPTCHA Secret Key
                          </Label>
                          <Input 
                            id="recaptcha-secret"
                            placeholder="Enter reCAPTCHA secret key"
                            defaultValue="6Lc_aCQUAAAAA..."
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="maintenance-mode" className="block text-sm font-medium mb-2">
                            Maintenance Mode
                          </Label>
                          <div className="flex items-center gap-2">
                            <Switch 
                              id="maintenance-mode"
                              defaultChecked={false}
                            />
                            <span className="text-sm text-muted-foreground">
                              Enable maintenance mode to restrict access
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Analytics & API Keys Tab */}
                    {systemSettingsTab === "analytics" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4">Analytics & API Keys</h3>
                        <div>
                          <Label htmlFor="analytics-id" className="block text-sm font-medium mb-2">
                            Google Analytics ID
                          </Label>
                          <Input 
                            id="analytics-id"
                            placeholder="Enter Google Analytics ID"
                            defaultValue="UA-XXXXXXXXX-X"
                          />
                        </div>
                        <div>
                          <Label htmlFor="stripe-key" className="block text-sm font-medium mb-2">
                            Stripe Publishable Key
                          </Label>
                          <Input 
                            id="stripe-key"
                            placeholder="Enter Stripe publishable key"
                            defaultValue="pk_test_XXXXXXXXXXXXXXXX"
                          />
                        </div>
                        <div>
                          <Label htmlFor="stripe-secret" className="block text-sm font-medium mb-2">
                            Stripe Secret Key
                          </Label>
                          <Input 
                            id="stripe-secret"
                            placeholder="Enter Stripe secret key"
                            defaultValue="sk_test_XXXXXXXXXXXXXXXX"
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="paypal-client" className="block text-sm font-medium mb-2">
                            PayPal Client ID
                          </Label>
                          <Input 
                            id="paypal-client"
                            placeholder="Enter PayPal client ID"
                            defaultValue="AXXXXXXXXXXXXXXXXXX"
                          />
                        </div>
                        <div>
                          <Label htmlFor="paypal-secret" className="block text-sm font-medium mb-2">
                            PayPal Secret
                          </Label>
                          <Input 
                            id="paypal-secret"
                            placeholder="Enter PayPal secret"
                            defaultValue="XXXXXXXXXXXXXXXXX"
                            type="password"
                          />
                        </div>
                      </div>
                    )}

                    {/* Session & Other Tab */}
                    {systemSettingsTab === "session" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4">Session & Other Settings</h3>
                        <div>
                          <Label id="site-status-label" className="block text-sm font-medium mb-2">
                            Site Status
                          </Label>
                          <Select defaultValue="online" aria-labelledby="site-status-label">
                            <SelectTrigger>
                              <SelectValue placeholder="Select site status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label id="admin-lockout-label" className="block text-sm font-medium mb-2">
                            Admin Lockout Duration
                          </Label>
                          <Select defaultValue="15" aria-labelledby="admin-lockout-label">
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 minutes</SelectItem>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label id="session-timeout-label" className="block text-sm font-medium mb-2">
                            Session Timeout
                          </Label>
                          <Select defaultValue="30" aria-labelledby="session-timeout-label">
                            <SelectTrigger>
                              <SelectValue placeholder="Select timeout" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 minutes</SelectItem>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="password-requirements" className="block text-sm font-medium mb-2">
                            Password Requirements
                          </Label>
                          <Textarea 
                            id="password-requirements"
                            placeholder="Enter password requirements"
                            defaultValue="Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}

                    {/* SSO Configuration Tab */}
                    {systemSettingsTab === "sso" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4">SSO Configuration</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Configure Single Sign-On (SSO) authentication with Google and Facebook
                        </p>
                        
                        {/* Google SSO */}
                        <div className="border rounded-lg p-4 space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <span className="text-blue-600">Google</span> OAuth Configuration
                          </h4>
                          <div>
                            <Label htmlFor="google-client-id" className="block text-sm font-medium mb-2">
                              Google Client ID
                            </Label>
                            <Input 
                              id="google-client-id"
                              placeholder="Enter Google OAuth Client ID"
                              value={systemSettings.googleClientId || ''}
                              onChange={(e) => updateSetting('googleClientId', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Get this from Google Cloud Console → APIs & Services → Credentials
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="google-client-secret" className="block text-sm font-medium mb-2">
                              Google Client Secret
                            </Label>
                            <Input 
                              id="google-client-secret"
                              placeholder="Enter Google OAuth Client Secret"
                              value={systemSettings.googleClientSecret || ''}
                              onChange={(e) => updateSetting('googleClientSecret', e.target.value)}
                              type="password"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Keep this secret secure. Never share it publicly.
                            </p>
                          </div>
                        </div>

                        {/* Facebook SSO */}
                        <div className="border rounded-lg p-4 space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <span className="text-blue-700">Facebook</span> OAuth Configuration
                          </h4>
                          <div>
                            <Label htmlFor="facebook-app-id" className="block text-sm font-medium mb-2">
                              Facebook App ID
                            </Label>
                            <Input 
                              id="facebook-app-id"
                              placeholder="Enter Facebook App ID"
                              value={systemSettings.facebookAppId || ''}
                              onChange={(e) => updateSetting('facebookAppId', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Get this from Facebook Developers → Your Apps → Settings → Basic
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="facebook-app-secret" className="block text-sm font-medium mb-2">
                              Facebook App Secret
                            </Label>
                            <Input 
                              id="facebook-app-secret"
                              placeholder="Enter Facebook App Secret"
                              value={systemSettings.facebookAppSecret || ''}
                              onChange={(e) => updateSetting('facebookAppSecret', e.target.value)}
                              type="password"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Keep this secret secure. Never share it publicly.
                            </p>
                          </div>
                        </div>

                        {/* SSO Status */}
                        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                          <h4 className="font-semibold">SSO Status</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Google Login</span>
                              <Switch 
                                checked={systemSettings.googleLoginEnabled ?? true}
                                onCheckedChange={(checked) => updateSetting('googleLoginEnabled', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Facebook Login</span>
                              <Switch 
                                checked={systemSettings.facebookLoginEnabled ?? true}
                                onCheckedChange={(checked) => updateSetting('facebookLoginEnabled', checked)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Save Buttons - Fixed at bottom */}
                    <div className="flex justify-end gap-2 pt-6 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          // Reset to original values
                          if (settingsData) {
                            setSystemSettings(settingsData);
                          }
                          toast({
                            description: "Changes cancelled",
                          });
                        }}
                        disabled={isSavingSettings}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="default" 
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings || isLoadingSettings}
                      >
                        {isSavingSettings ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Analytics */}
          {activeTab === "analytics" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>View and analyze site usage and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="analytics-google" className="block text-sm font-medium mb-2">
                        Google Analytics
                      </Label>
                      <Input 
                        id="analytics-google"
                        placeholder="Enter your Google Analytics ID"
                        value="UA-XXXXXXXXX-X"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analytics-facebook" className="block text-sm font-medium mb-2">
                        Facebook Pixel
                      </Label>
                      <Input 
                        id="analytics-facebook"
                        placeholder="Enter your Facebook Pixel ID"
                        value="1234567890"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analytics-twitter" className="block text-sm font-medium mb-2">
                        Twitter Analytics
                      </Label>
                      <Input 
                        id="analytics-twitter"
                        placeholder="Enter your Twitter Analytics ID"
                        value="XXXXXXXXXXXX"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analytics-linkedin" className="block text-sm font-medium mb-2">
                        LinkedIn Insight Tag
                      </Label>
                      <Input 
                        id="analytics-linkedin"
                        placeholder="Enter your LinkedIn Insight Tag ID"
                        value="123456789"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analytics-pinterest" className="block text-sm font-medium mb-2">
                        Pinterest Tag
                      </Label>
                      <Input 
                        id="analytics-pinterest"
                        placeholder="Enter your Pinterest Tag ID"
                        value="1234567890"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analytics-tiktok" className="block text-sm font-medium mb-2">
                        TikTok Pixel
                      </Label>
                      <Input 
                        id="analytics-tiktok"
                        placeholder="Enter your TikTok Pixel ID"
                        value="1234567890"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analytics-snapchat" className="block text-sm font-medium mb-2">
                        Snapchat Pixel
                      </Label>
                      <Input 
                        id="analytics-snapchat"
                        placeholder="Enter your Snapchat Pixel ID"
                        value="1234567890"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analytics-utm" className="block text-sm font-medium mb-2">
                        UTM Parameters
                      </Label>
                      <Input 
                        id="analytics-utm"
                        placeholder="Enter default UTM parameters"
                        value="utm_source=filmflex&utm_medium=admin&utm_campaign=analytics"
                        onChange={() => {}}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="default" onClick={() => {}}>
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => {}}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage security settings and access controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="admin-password" className="block text-sm font-medium mb-2">
                        Admin Password
                      </Label>
                      <Input 
                        id="admin-password"
                        placeholder="Enter new admin password"
                        value="********"
                        onChange={() => {}}
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-password-confirm" className="block text-sm font-medium mb-2">
                        Confirm Password
                      </Label>
                      <Input 
                        id="admin-password-confirm"
                        placeholder="Confirm new admin password"
                        value="********"
                        onChange={() => {}}
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="two-factor-auth" className="block text-sm font-medium mb-2">
                        Two-Factor Authentication
                      </Label>
                      <Switch 
                        id="two-factor-auth"
                        checked={true}
                        onCheckedChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ip-whitelist" className="block text-sm font-medium mb-2">
                        IP Whitelist
                      </Label>
                      <Textarea 
                        id="ip-whitelist"
                        placeholder="Enter IP addresses to whitelist, separated by commas"
                        value="192.168.1.1, 192.168.1.2"
                        onChange={() => {}}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-lockout" className="block text-sm font-medium mb-2">
                        Admin Lockout Duration
                      </Label>
                      <Select 
                        defaultValue="15"
                        onValueChange={() => {}}
                        aria-labelledby="admin-lockout-label"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="session-timeout" className="block text-sm font-medium mb-2">
                        Session Timeout
                      </Label>
                      <Select 
                        defaultValue="30"
                        onValueChange={() => {}}
                        aria-labelledby="session-timeout-label"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="password-requirements" className="block text-sm font-medium mb-2">
                        Password Requirements
                      </Label>
                      <Textarea 
                        id="password-requirements"
                        placeholder="Enter password requirements"
                        value="Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character"
                        onChange={() => {}}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="default" onClick={() => {}}>
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => {}}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Audit Logs */}
          {activeTab === "audit-logs" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs</CardTitle>
                  <CardDescription>View system audit logs and user activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-2 text-left font-medium">ID</th>
                          <th className="py-3 px-2 text-left font-medium">User</th>
                          <th className="py-3 px-2 text-left font-medium">Action</th>
                          <th className="py-3 px-2 text-left font-medium">Details</th>
                          <th className="py-3 px-2 text-left font-medium">Timestamp</th>
                          <th className="py-3 px-2 text-left font-medium">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockAuditLogs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-muted/10">
                            <td className="py-4 px-2">{log.id}</td>
                            <td className="py-4 px-2">{log.user}</td>
                            <td className="py-4 px-2">{log.action}</td>
                            <td className="py-4 px-2">{log.details}</td>
                            <td className="py-4 px-2">{log.timestamp}</td>
                            <td className="py-4 px-2">{log.ip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          </div>
          {/* End of content area */}

        </SidebarInset>
      </div>

      {/* Full Screen Edit Dialog */}
      <Dialog 
        open={fullScreenEdit} 
        onOpenChange={setFullScreenEdit}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Edit movie or TV show details
            </DialogDescription>
          </DialogHeader>

          {isLoadingMovieDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : currentEditMovie ? (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title"
                      value={currentEditMovie.name}
                      onChange={(e) => setCurrentEditMovie({
                        ...currentEditMovie,
                        name: e.target.value
                      })}
                      readOnly
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input 
                      id="slug"
                      value={currentEditMovie.slug || ""}
                      onChange={(e) => setCurrentEditMovie({
                        ...currentEditMovie,
                        slug: e.target.value
                      })}
                      placeholder="movie-slug-format"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Content Type</Label>
                    <Select 
                      value={currentEditMovie.type || "single"}
                      onValueChange={(value) => setCurrentEditMovie({
                        ...currentEditMovie,
                        type: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Movie</SelectItem>
                        <SelectItem value="series">TV Series</SelectItem>
                        <SelectItem value="anime">Anime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(currentEditMovie.type === "series" || currentEditMovie.type === "anime") && (
                    <>
                      <div>
                        <Label htmlFor="episode_current">Current Episode</Label>
                        <div className="relative">
                          <Input 
                            id="episode_current"
                            value={currentEditMovie.episode_current || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || value === "Full" || /^\d+$/.test(value)) {
                                setCurrentEditMovie({
                                  ...currentEditMovie,
                                  episode_current: value
                                });
                              }
                            }}
                            placeholder="e.g. 12 or Full"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            Enter a number or "Full" for completed series
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="episode_total">Total Episodes</Label>
                        <div className="relative">
                          <Input 
                            id="episode_total"
                            value={currentEditMovie.episode_total || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                setCurrentEditMovie({
                                  ...currentEditMovie,
                                  episode_total: value
                                });
                              }
                            }}
                            placeholder="e.g. 24"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            Enter total number of episodes in the series
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={currentEditMovie.status || "ongoing"}
                      onValueChange={(value) => setCurrentEditMovie({
                        ...currentEditMovie,
                        status: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Select 
                      value={currentEditMovie.section}
                      onValueChange={(value) => setCurrentEditMovie({
                        ...currentEditMovie,
                        section: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="trending_now">Trending Now</SelectItem>
                        <SelectItem value="latest_movies">Latest Movies</SelectItem>
                        <SelectItem value="top_rated">Top Rated Movies</SelectItem>
                        <SelectItem value="popular_tv">Popular TV Series</SelectItem>
                        <SelectItem value="anime">Anime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input 
                      id="year"
                      value={currentEditMovie.year || ""}
                      onChange={(e) => setCurrentEditMovie({
                        ...currentEditMovie,
                        year: e.target.value
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="origin-name">Original Title</Label>
                    <Input 
                      id="origin-name"
                      value={currentEditMovie.origin_name || ""}
                      onChange={(e) => setCurrentEditMovie({
                        ...currentEditMovie,
                        origin_name: e.target.value
                      })}
                      readOnly
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="recommended"
                      checked={currentEditMovie.isRecommended === true}
                      onCheckedChange={(checked) => setCurrentEditMovie({
                        ...currentEditMovie,
                        isRecommended: checked === true
                      })}
                    />
                    <Label htmlFor="recommended">Recommended</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="content">Description</Label>
                <Textarea 
                  id="content"
                  value={currentEditMovie.content || ""}
                  rows={5}
                  readOnly
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setFullScreenEdit(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleMovieSave}
                  disabled={!currentEditMovie.name}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No content selected for editing
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* End of Dialog */}
      
    </SidebarProvider>
  );
}
