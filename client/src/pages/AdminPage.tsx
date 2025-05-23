import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MovieListResponse } from "@shared/schema";
import { toast } from "react-hot-toast";

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
  director?: CategoryType[];
  category?: CategoryType[];
  country?: CategoryType[];
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Film,
  Settings,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  AlertCircle,
  Search,
  Plus,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
  SlidersHorizontal,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Edit,
  Upload
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

// Predefined categories and countries for the multi-select components
const predefinedCategories = [
  "Hành Động", "Tình Cảm", "Hài Hước", "Cổ Trang", "Võ Thuật", "Kinh Dị", "Hình Sự", 
  "Chiến Tranh", "Thể Thao", "Âm Nhạc", "Tâm Lý", "Viễn Tưởng", "Phiêu Lưu", "Khoa Học",
  "Thần Thoại", "Hoạt Hình", "Gia Đình", "Bí Ẩn", "Học Đường", "Kinh Điển"
];

const predefinedCountries = [
  "Trung Quốc", "Hàn Quốc", "Việt Nam", "Mỹ", "Thái Lan", "Hồng Kông", "Nhật Bản", 
  "Ấn Độ", "Đài Loan", "Pháp", "Anh", "Canada", "Đức", "Nga", "Úc", "Brazil", "Malaysia",
  "Indonesia", "Philippines", "Singapore", "Tây Ban Nha", "Ý", "Thổ Nhĩ Kỳ", "Mexico"
];

// Component for multi-select tags
interface MultiSelectProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function MultiSelectTags({ options, selectedValues, onChange, placeholder = "Select options..." }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={open} 
          className="w-full justify-between h-auto min-h-10 py-2"
        >
          {selectedValues.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedValues.map((value) => (
                <Badge 
                  key={value} 
                  variant="secondary"
                  className="flex items-center gap-1 max-w-[150px] truncate"
                >
                  {value}
                  <div
                    className="ml-1 rounded-full outline-none focus:outline-none cursor-pointer inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(selectedValues.filter((v) => v !== value));
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${value}`}
                  >
                    <X className="h-3 w-3" />
                  </div>
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search options..." />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandList>
            <ScrollArea className="h-[200px]">
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option);
                  return (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => {
                        onChange(
                          isSelected
                            ? selectedValues.filter((value) => value !== option)
                            : [...selectedValues, option]
                        );
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="mr-2"
                      />
                      {option}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  // Changed default from "user-management" to "content-management"
  const [activeTab, setActiveTab] = useState("content-management");
  const [currentPage, setCurrentPage] = useState(1);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [recommendedFilter, setRecommendedFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fullScreenEdit, setFullScreenEdit] = useState(false);
  const [currentEditMovie, setCurrentEditMovie] = useState<MovieDetailsType | null>(null);
  const [isLoadingMovieDetails, setIsLoadingMovieDetails] = useState(false);
  
  // State for multi-select values in edit dialog
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  
  // Add isAuthenticated variable to fix undefined error
  const isAuthenticated = !!user;
  
  const queryClient = useQueryClient();
  
  // Function to fetch full movie details
  const fetchMovieDetails = async (slug: string) => {
    setIsLoadingMovieDetails(true);
    try {
      // Create a cache-busting URL with timestamp and a random string
      // to ensure we get fresh data every time
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const url = `/api/movies/${slug}?_t=${timestamp}&r=${randomStr}&clear_cache=true`;
      
      console.log(`Fetching movie details from: ${url}`);
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
      
      console.log("Raw movie data from API:", movieData);
      
      // Ensure we have proper default values for section and isRecommended
      const formattedMovie = {
        ...movieData,
        // Convert null/undefined section to "none" for the UI dropdown
        section: movieData.section || "none", 
        // Ensure isRecommended is a boolean - use strict equality
        isRecommended: movieData.isRecommended === true 
      };
      
      console.log("Fetched movie data:", movieData);
      console.log("Formatted movie for editing:", {
        section: formattedMovie.section,
        isRecommended: formattedMovie.isRecommended
      });
      
      // Store the formatted movie in state
      setCurrentEditMovie(formattedMovie);
      
      // Extract categories and countries
      if (movieData.category && Array.isArray(movieData.category)) {
        const categoryNames = movieData.category
          .filter((cat: any) => cat && (typeof cat === 'string' || cat.name))
          .map((cat: any) => typeof cat === 'string' ? cat : cat.name);
        setSelectedCategories(categoryNames);
      }
      
      if (movieData.country && Array.isArray(movieData.country)) {
        const countryNames = movieData.country
          .filter((country: any) => country && (typeof country === 'string' || country.name))
          .map((country: any) => typeof country === 'string' ? country : country.name);
        setSelectedCountries(countryNames);
      }

      setIsLoadingMovieDetails(false);
    } catch (error) {
      console.error("Error fetching movie details:", error);
      toast.error(`Error fetching movie details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoadingMovieDetails(false);
    }
  };
  
  // Function to handle movie save
  const handleMovieSave = async () => {
    try {
      // Validate required fields
      if (!currentEditMovie?.name) {
        toast.error("Movie title is required");
        return;
      }

      // Convert selectedCategories and selectedCountries to the format expected by the API
      const formattedCategories = selectedCategories.map(name => ({ name }));
      const formattedCountries = selectedCountries.map(name => ({ name }));

      // Format the data for the API with explicit type handling
      const updateData = {
        name: currentEditMovie.name,
        origin_name: currentEditMovie.origin_name || "",
        content: currentEditMovie.content || "",
        // Handle section field - convert "none" to null
        section: currentEditMovie.section === "none" ? null : currentEditMovie.section,
        // Ensure isRecommended is explicitly included as a boolean
        isRecommended: currentEditMovie.isRecommended === true,
        // Add categories and countries
        category: formattedCategories,
        country: formattedCountries,
        // other fields that might need updating
        status: currentEditMovie.status,
        thumb_url: currentEditMovie.thumb_url,
        poster_url: currentEditMovie.poster_url,
        active: currentEditMovie.active === true
      };

      // Debug logging with type information
      console.log("Saving movie with data:", {
        section: updateData.section, 
        sectionType: typeof updateData.section,
        isRecommended: updateData.isRecommended,
        isRecommendedType: typeof updateData.isRecommended,
        categories: formattedCategories.length,
        countries: formattedCountries.length
      });

      // Display "Saving..." toast that will be updated with success or error
      const savingToastId = toast.loading("Saving movie data...");

      // Send the update request with explicit no-cache headers
      const response = await fetch(`/api/movies/${currentEditMovie.slug}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          // Add cache control headers to prevent browser caching
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify(updateData)
      });

      // Check for HTTP errors
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || `Error: ${response.status} ${response.statusText}`;
        console.error("Error saving movie:", errorMessage);
        toast.error(`Failed to update movie: ${errorMessage}`, { id: savingToastId });
        throw new Error(`Failed to update movie: ${errorMessage}`);
      }

      const savedData = await response.json();
      
      if (!savedData.status || !savedData.movie) {
        toast.error("Server returned success but with invalid data", { id: savingToastId });
        throw new Error("Server returned success but with invalid data");
      }

      // Log server response with details about types
      console.log("Server response:", {
        section: savedData.movie.section,
        sectionType: typeof savedData.movie.section,
        isRecommended: savedData.movie.isRecommended,
        isRecommendedType: typeof savedData.movie.isRecommended,
        categories: savedData.movie.category?.length || 0,
        countries: savedData.movie.country?.length || 0
      });
      
      // Update the current edit movie with the saved data
      // Make sure we handle section and isRecommended properly
      setCurrentEditMovie(prev => {
        if (!prev) return savedData.movie;
        
        const updated = {
          ...prev,
          ...savedData.movie,
          // Explicitly convert section to string or "none"
          section: savedData.movie.section === null ? "none" : savedData.movie.section || "none",
          // Explicitly convert isRecommended to boolean
          isRecommended: Boolean(savedData.movie.isRecommended)
        };
        
        console.log("Updated movie state:", { 
          section: updated.section, 
          isRecommended: updated.isRecommended
        });
        
        return updated;
      });

      // Update categories and countries if present in the response
      if (savedData.movie.category && Array.isArray(savedData.movie.category)) {
        const categoryNames = savedData.movie.category
          .filter((cat: any) => cat && (typeof cat === 'string' || cat.name))
          .map((cat: any) => typeof cat === 'string' ? cat : cat.name);
        setSelectedCategories(categoryNames);
      }
      
      if (savedData.movie.country && Array.isArray(savedData.movie.country)) {
        const countryNames = savedData.movie.country
          .filter((country: any) => country && (typeof country === 'string' || country.name))
          .map((country: any) => typeof country === 'string' ? country : country.name);
        setSelectedCountries(countryNames);
      }

      // Log successful save
      console.log("Movie saved successfully:", {
        section: savedData.movie.section,
        isRecommended: savedData.movie.isRecommended
      });

      // Show success toast after the save
      toast.success("Movie updated successfully", { id: savingToastId });

      // Update the loading toast with success message
      toast.success(
        `"${currentEditMovie.name}" was updated successfully with section: ${savedData.movie.section ? savedData.movie.section : 'None'} and ${savedData.movie.isRecommended ? 'marked as recommended' : 'not marked as recommended'}`
      );

      // Close the dialog after successful update
      setFullScreenEdit(false);
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] }); // This invalidates all movie queries including the admin list
      queryClient.invalidateQueries({ queryKey: [`/api/admin/movies`] }); // Invalidate admin-specific queries
      
      // Reload the movie details directly to ensure fresh data
      await fetchMovieDetails(currentEditMovie.slug);

    } catch (error) {
      console.error("Error saving movie:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    }
  };

  // Fetch real movie data
  const { data: moviesData, isLoading: isLoadingMovies, error: moviesError } = useQuery({
    queryKey: ["/api/movies", currentPage, sectionFilter, categoryFilter, countryFilter, recommendedFilter, searchQuery, itemsPerPage],
    queryFn: async () => {
      // If there are no specific filters active and we're on the content management tab,
      // use the admin endpoint to fetch all movies by default
      if (activeTab === "content-management" && 
          !searchQuery.trim() && 
          sectionFilter === "all" && 
          categoryFilter.length === 0 && 
          countryFilter.length === 0 && 
          recommendedFilter === "all") {
        
        // Use the admin endpoint that fetches all movies
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(itemsPerPage)
        });
        
        const url = `/api/admin/movies?${params.toString()}`;
        console.log(`Fetching all movies from admin endpoint: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch movies");
        }
        
        return await response.json() as MovieListResponse;
      }
      
      // Construct base query parameters for filtered searches
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage)
      });
      
      // Add section filter if specified
      if (sectionFilter !== "all") {
        params.append("section", sectionFilter);
      }
      
      // If search query exists, use full-text search across multiple fields
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
        params.append("fields", "name,origin_name,content,description,actor,director,category,country");
      }
      
      let url = `/api/search?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch movies");
      }
      
      const data = await response.json() as MovieListResponse;
      
      // Apply client-side filters for categories, countries, and recommendation status
      let filteredItems = [...data.items];
      
      // Apply category filter if any categories are selected
      if (categoryFilter.length > 0) {
        filteredItems = filteredItems.filter(movie => {
          const movieCategories = Array.isArray((movie as any).category) 
            ? (movie as any).category 
            : (movie as unknown as MovieDetailsType).categories || [];
            
          // Check if any of the selected categories match this movie
          return categoryFilter.some(selectedCat => 
            movieCategories.some(cat => 
              (typeof cat === "string" && cat === selectedCat) || 
              (typeof cat === "object" && cat?.id === selectedCat)
            )
          );
        });
      }
      
      // Apply country filter if any countries are selected
      if (countryFilter.length > 0) {
        filteredItems = filteredItems.filter(movie => {
          const movieCountries = Array.isArray((movie as any).country) 
            ? (movie as any).country 
            : (movie as unknown as MovieDetailsType).countries || [];
            
          // Check if any of the selected countries match this movie
          return countryFilter.some(selectedCountry => 
            movieCountries.some(country => 
              (typeof country === "string" && country === selectedCountry) ||
              (typeof country === "object" && country?.id === selectedCountry)
            )
          );
        });
      }
      
      // Apply recommended filter if enabled
      if (recommendedFilter === "yes") {
        filteredItems = filteredItems.filter(movie => 
          (movie as unknown as MovieDetailsType).isRecommended === true
        );
      } else if (recommendedFilter === "no") {
        filteredItems = filteredItems.filter(movie => 
          (movie as unknown as MovieDetailsType).isRecommended !== true
        );
      }
      
      return {
        ...data,
        items: filteredItems,
        pagination: {
          ...data.pagination,
          totalItems: filteredItems.length,
          totalPages: Math.ceil(filteredItems.length / itemsPerPage)
        }
      };
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });

  // Mock data for users (keeping this for now)
  const mockUsers = [
    { id: 1, username: "admin", email: "admin@filmflex.com", role: "admin", status: "active", lastLogin: "2023-12-25 10:30" },
    { id: 2, username: "moderator1", email: "mod1@filmflex.com", role: "moderator", status: "active", lastLogin: "2023-12-24 14:15" },
    { id: 3, username: "john_doe", email: "john@example.com", role: "user", status: "active", lastLogin: "2023-12-23 09:45" },
    { id: 4, username: "jane_smith", email: "jane@example.com", role: "user", status: "inactive", lastLogin: "2023-12-20 16:22" },
    { id: 5, username: "viewer99", email: "viewer@example.com", role: "user", status: "active", lastLogin: "2023-12-22 11:05" },
  ];

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
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-4"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Site
        </Button>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-3 lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2 mt-2">
                <Button 
                  variant={activeTab === "user-management" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("user-management")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  User Management
                </Button>
                <Button 
                  variant={activeTab === "content-management" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("content-management")}
                >
                  <Film className="mr-2 h-4 w-4" />
                  Content Management
                </Button>
                <Button 
                  variant={activeTab === "system-settings" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("system-settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  System Settings
                </Button>
                <Button 
                  variant={activeTab === "analytics" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("analytics")}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Button>
                <Button 
                  variant={activeTab === "security" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("security")}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Security
                </Button>

                <Button 
                  variant={activeTab === "audit-logs" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("audit-logs")}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Audit Logs
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6">
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
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => {
                        // Reset filters
                        setSectionFilter("all");
                        setCategoryFilter([]);
                        setCountryFilter([]);
                        setRecommendedFilter("all");
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
                  </div>

                  {/* Advanced Filter Panel */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-md mb-4">
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
                          <SelectItem key="none-section" value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="category-filter" className="text-sm font-medium block mb-2">
                        Categories
                      </Label>
                      <MultiSelectTags
                        options={predefinedCategories}
                        selectedValues={categoryFilter}
                        onChange={setCategoryFilter}
                        placeholder="Select categories"
                      />
                    </div>

                    <div>
                      <Label htmlFor="country-filter" className="text-sm font-medium block mb-2">
                        Country
                      </Label>
                      <MultiSelectTags
                        options={predefinedCountries}
                        selectedValues={countryFilter}
                        onChange={setCountryFilter}
                        placeholder="Select countries"
                      />
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
                                  <div className="flex items-center">
                                    {movieDetails.thumb_url && (
                                      <div className="w-8 h-12 mr-2 rounded overflow-hidden">
                                        <img 
                                          src={movieDetails.thumb_url} 
                                          alt={movieDetails.name} 
                                          className="w-full h-full object-cover"
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
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="site-title" className="block text-sm font-medium mb-2">
                        Site Title
                      </Label>
                      <Input 
                        id="site-title"
                        placeholder="Enter the site title"
                        value="FilmFlex Admin"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="site-url" className="block text-sm font-medium mb-2">
                        Site URL
                      </Label>
                      <Input 
                        id="site-url"
                        placeholder="Enter the site URL"
                        value="https://admin.filmflex.com"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-email" className="block text-sm font-medium mb-2">
                        Admin Email
                      </Label>
                      <Input 
                        id="admin-email"
                        placeholder="Enter the admin email"
                        value="admin@filmflex.com"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="support-email" className="block text-sm font-medium mb-2">
                        Support Email
                      </Label>
                      <Input 
                        id="support-email"
                        placeholder="Enter the support email"
                        value="support@filmflex.com"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="site-description" className="block text-sm font-medium mb-2">
                        Site Description
                      </Label>
                      <Textarea 
                        id="site-description"
                        placeholder="Enter a brief description of the site"
                        value="A premier platform for watching and sharing films and TV shows."
                        onChange={() => {}}
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
                        value="films, movies, tv shows, streaming"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label id="timezone-label" className="block text-sm font-medium mb-2">
                        Timezone
                      </Label>
                      <Select 
                        defaultValue="UTC"
                        onValueChange={() => {}}
                        aria-labelledby="timezone-label"
                      >
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
                      <Select 
                        defaultValue="en"
                        onValueChange={() => {}}
                        aria-labelledby="language-label"
                      >
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
                      <Select 
                        defaultValue="USD"
                        onValueChange={() => {}}
                        aria-labelledby="currency-label"
                      >
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
                      <Select 
                        defaultValue="stripe"
                        onValueChange={() => {}}
                        aria-labelledby="payment-gateway-label"
                      >
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
                    <div>
                      <Label htmlFor="site-logo" className="block text-sm font-medium mb-2">
                        Site Logo
                      </Label>
                      <div className="flex items-center gap-2">
                        <AvatarFallback className="w-12 h-12 rounded-full bg-muted">
                          <span className="text-xl font-semibold">FL</span>
                        </AvatarFallback>
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
                        <AvatarFallback className="w-10 h-10 rounded-full bg-muted">
                          <span className="text-xl font-semibold">F</span>
                        </AvatarFallback>
                        <Button variant="outline" size="sm">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Favicon
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email-smtp" className="block text-sm font-medium mb-2">
                        SMTP Server
                      </Label>
                      <Input 
                        id="email-smtp"
                        placeholder="Enter SMTP server address"
                        value="smtp.filmflex.com"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-port" className="block text-sm font-medium mb-2">
                        SMTP Port
                      </Label>
                      <Input 
                        id="email-port"
                        placeholder="Enter SMTP server port"
                        value="587"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-user" className="block text-sm font-medium mb-2">
                        SMTP Username
                      </Label>
                      <Input 
                        id="email-user"
                        placeholder="Enter SMTP username"
                        value="admin@filmflex.com"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-pass" className="block text-sm font-medium mb-2">
                        SMTP Password
                      </Label>
                      <Input 
                        id="email-pass"
                        placeholder="Enter SMTP password"
                        value="********"
                        onChange={() => {}}
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
                        value="no-reply@filmflex.com"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-name" className="block text-sm font-medium mb-2">
                        Email From Name
                      </Label>
                      <Input 
                        id="email-name"
                        placeholder="Enter the from name for emails"
                        value="FilmFlex Support"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="recaptcha-site" className="block text-sm font-medium mb-2">
                        reCAPTCHA Site Key
                      </Label>
                      <Input 
                        id="recaptcha-site"
                        placeholder="Enter reCAPTCHA site key"
                        value="6Lc_aCQUAAAAA..."
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="recaptcha-secret" className="block text-sm font-medium mb-2">
                        reCAPTCHA Secret Key
                      </Label>
                      <Input 
                        id="recaptcha-secret"
                        placeholder="Enter reCAPTCHA secret key"
                        value="6Lc_aCQUAAAAA..."
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maintenance-mode" className="block text-sm font-medium mb-2">
                        Maintenance Mode
                      </Label>
                      <Switch 
                        id="maintenance-mode"
                        checked={false}
                        onCheckedChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analytics-id" className="block text-sm font-medium mb-2">
                        Google Analytics ID
                      </Label>
                      <Input 
                        id="analytics-id"
                        placeholder="Enter Google Analytics ID"
                        value="UA-XXXXXXXXX-X"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe-key" className="block text-sm font-medium mb-2">
                        Stripe Publishable Key
                      </Label>
                      <Input 
                        id="stripe-key"
                        placeholder="Enter Stripe publishable key"
                        value="pk_test_XXXXXXXXXXXXXXXX"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe-secret" className="block text-sm font-medium mb-2">
                        Stripe Secret Key
                      </Label>
                      <Input 
                        id="stripe-secret"
                        placeholder="Enter Stripe secret key"
                        value="sk_test_XXXXXXXXXXXXXXXX"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="paypal-client" className="block text-sm font-medium mb-2">
                        PayPal Client ID
                      </Label>
                      <Input 
                        id="paypal-client"
                        placeholder="Enter PayPal client ID"
                        value="AXXXXXXXXXXXXXXXXXX"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label htmlFor="paypal-secret" className="block text-sm font-medium mb-2">
                        PayPal Secret
                      </Label>
                      <Input 
                        id="paypal-secret"
                        placeholder="Enter PayPal secret"
                        value="XXXXXXXXXXXXXXXXX"
                        onChange={() => {}}
                      />
                    </div>
                    <div>
                      <Label id="site-status-label" className="block text-sm font-medium mb-2">
                        Site Status
                      </Label>
                      <Select 
                        defaultValue="online"
                        onValueChange={() => {}}
                        aria-labelledby="site-status-label"
                      >
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
                      <Label id="session-timeout-label" className="block text-sm font-medium mb-2">
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
                      value={currentEditMovie.slug}
                      readOnly
                      className="bg-muted"
                    />
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

                  <div>
                    <Label>Categories</Label>
                    <MultiSelectTags 
                      options={predefinedCategories}
                      selectedValues={selectedCategories}
                      onChange={setSelectedCategories}
                      placeholder="Select categories"
                    />
                  </div>

                  <div>
                    <Label>Countries</Label>
                    <MultiSelectTags 
                      options={predefinedCountries}
                      selectedValues={selectedCountries}
                      onChange={setSelectedCountries}
                      placeholder="Select countries"
                    />
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
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Input 
                      id="language"
                      value={currentEditMovie.lang || ""}
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

    </div>
  );
}
