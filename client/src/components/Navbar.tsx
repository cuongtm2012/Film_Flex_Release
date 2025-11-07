import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, LogOut, User, Settings, BookmarkPlus, Clock, Search, ChevronRight, Menu, Home, Film, Newspaper, HelpCircle, Info, Scale, UserCircle, Bell } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";

interface SearchSuggestion {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url?: string;
  type: string;
}

interface NavbarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function Navbar({ isMobileMenuOpen: externalMobileMenuOpen, setIsMobileMenuOpen: externalSetMobileMenuOpen }: NavbarProps = {}) {
  const [search, setSearch] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 400);

  // Use external state if provided, otherwise use internal state
  const isMobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen;
  const setIsMobileMenuOpen = externalSetMobileMenuOpen || setInternalMobileMenuOpen;

  useEffect(() => {
    const handleScroll = () => {
      const show = window.scrollY > 50;
      if (show !== isScrolled) {
        setIsScrolled(show);
      }
    };

    document.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("scroll", handleScroll);
    };
  }, [isScrolled]);

  // Close suggestions when clicking outside search box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [searchBoxRef]);

  // Fetch search suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['/api/search/suggestions', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return { items: [] };
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedSearch.trim())}`);
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
  });
  
  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      const trimmedSearch = search.trim();
      // Set both the history state and directly navigate to ensure consistency
      navigate(`/search?q=${encodeURIComponent(trimmedSearch)}`);
      // Force a reload to ensure consistent behavior with the main search
      window.location.href = `/search?q=${encodeURIComponent(trimmedSearch)}`;
      setShowSuggestions(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate('/auth');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-background shadow-md" : "bg-gradient-to-b from-black to-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-white hover:bg-white/10"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 bg-background border-gray-800">
                  <SheetHeader>
                    <SheetTitle className="text-left text-primary font-bold text-xl">
                      PhimGG
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-8 space-y-4">
                    <Link 
                      to="/" 
                      className="flex items-center space-x-3 text-white hover:text-primary transition p-3 rounded-lg hover:bg-white/5"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Home className="h-5 w-5" />
                      <span className="font-medium">Home</span>
                    </Link>
                    <Link 
                      to="/movies" 
                      className="flex items-center space-x-3 text-muted-foreground hover:text-white transition p-3 rounded-lg hover:bg-white/5"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Film className="h-5 w-5" />
                      <span className="font-medium">Movies</span>
                    </Link>
                    <Link 
                      to="/news" 
                      className="flex items-center space-x-3 text-muted-foreground hover:text-white transition p-3 rounded-lg hover:bg-white/5"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Newspaper className="h-5 w-5" />
                      <span className="font-medium">News & Popular</span>
                    </Link>
                    {user && (
                      <Link 
                        to="/my-list" 
                        className="flex items-center space-x-3 text-muted-foreground hover:text-white transition p-3 rounded-lg hover:bg-white/5"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <BookmarkPlus className="h-5 w-5" />
                        <span className="font-medium">My List</span>
                      </Link>
                    )}

                    {/* Account Section */}
                    <div className="border-t border-gray-800 my-4"></div>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Account
                    </div>
                    {user ? (
                      <>
                        <Link 
                          to="/profile" 
                          className="flex items-center space-x-3 text-muted-foreground hover:text-white transition p-3 rounded-lg hover:bg-white/5"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <UserCircle className="h-5 w-5" />
                          <span className="font-medium">Profile</span>
                        </Link>
                        <Link 
                          to="/settings" 
                          className="flex items-center space-x-3 text-muted-foreground hover:text-white transition p-3 rounded-lg hover:bg-white/5"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Settings className="h-5 w-5" />
                          <span className="font-medium">Settings</span>
                        </Link>
                        <button 
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center space-x-3 text-red-500 hover:text-red-400 transition p-3 rounded-lg hover:bg-white/5 w-full text-left"
                        >
                          <LogOut className="h-5 w-5" />
                          <span className="font-medium">Log out</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <Link 
                          to="/auth?mode=login" 
                          className="flex items-center space-x-3 text-muted-foreground hover:text-white transition p-3 rounded-lg hover:bg-white/5"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <User className="h-5 w-5" />
                          <span className="font-medium">Sign In</span>
                        </Link>
                        <Link 
                          to="/auth?mode=register" 
                          className="flex items-center space-x-3 text-primary hover:text-primary/80 transition p-3 rounded-lg hover:bg-white/5"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <UserCircle className="h-5 w-5" />
                          <span className="font-medium">Sign Up</span>
                        </Link>
                      </>
                    )}

                    {/* Divider */}
                    <div className="border-t border-gray-800 my-4"></div>

                    {/* Footer Sections in Mobile Menu */}
                    <Accordion type="single" collapsible className="w-full">
                      {/* Browse Section */}
                      <AccordionItem value="browse" className="border-gray-800">
                        <AccordionTrigger className="text-white hover:text-primary p-3 hover:no-underline">
                          <div className="flex items-center space-x-3">
                            <Film className="h-5 w-5" />
                            <span className="font-medium">Browse</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-11 space-y-2 pb-2">
                          <Link 
                            to="/movies" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Movies
                          </Link>
                          <Link 
                            to="/movies?type=series" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            TV Shows
                          </Link>
                          <Link 
                            to="/movies?type=hoathinh" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Anime
                          </Link>
                          <Link 
                            to="/news" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            New & Popular
                          </Link>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Help Section */}
                      <AccordionItem value="help" className="border-gray-800">
                        <AccordionTrigger className="text-white hover:text-primary p-3 hover:no-underline">
                          <div className="flex items-center space-x-3">
                            <HelpCircle className="h-5 w-5" />
                            <span className="font-medium">Help</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-11 space-y-2 pb-2">
                          <Link 
                            to="/faq" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            FAQ
                          </Link>
                          <Link 
                            to="/help-center" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Help Center
                          </Link>
                          <Link 
                            to="/contact" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Contact Us
                          </Link>
                        </AccordionContent>
                      </AccordionItem>

                      {/* About Section */}
                      <AccordionItem value="about" className="border-gray-800">
                        <AccordionTrigger className="text-white hover:text-primary p-3 hover:no-underline">
                          <div className="flex items-center space-x-3">
                            <Info className="h-5 w-5" />
                            <span className="font-medium">About</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-11 space-y-2 pb-2">
                          <Link 
                            to="/about" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            About Us
                          </Link>
                          <Link 
                            to="/careers" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Careers
                          </Link>
                          <Link 
                            to="/press" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Press
                          </Link>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Legal Section */}
                      <AccordionItem value="legal" className="border-b-0">
                        <AccordionTrigger className="text-white hover:text-primary p-3 hover:no-underline">
                          <div className="flex items-center space-x-3">
                            <Scale className="h-5 w-5" />
                            <span className="font-medium">Legal</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-11 space-y-2 pb-2">
                          <Link 
                            to="/terms" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Terms of Service
                          </Link>
                          <Link 
                            to="/privacy" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Privacy Policy
                          </Link>
                          <Link 
                            to="/cookies" 
                            className="block text-muted-foreground hover:text-white transition py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Cookie Preferences
                          </Link>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </nav>
                </SheetContent>
              </Sheet>
            )}

            {/* Logo */}
            <Link to="/" className="text-primary font-bold text-2xl">
              PhimGG
            </Link>

            {/* Main Navigation - Hide on Mobile */}
            {!isMobile && (
              <nav className="hidden md:flex space-x-6">
                <Link to="/" className="text-white font-medium hover:text-primary transition">
                  Home
                </Link>
                <Link to="/movies" className="text-muted-foreground font-medium hover:text-white transition">
                  Movies
                </Link>
                <Link to="/news" className="text-muted-foreground font-medium hover:text-white transition">
                  News & Popular
                </Link>
                {user && (
                  <Link to="/my-list" className="text-muted-foreground font-medium hover:text-white transition">
                    My List
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Search Box - Improved mobile layout */}
            <div ref={searchBoxRef} className="relative">
              <form onSubmit={handleSubmitSearch} className="relative">
                <Input
                  type="search"
                  data-testid="search-input"
                  placeholder={isMobile ? "Search..." : "Search movies..."}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (e.target.value.length >= 2) {
                      setShowSuggestions(true);
                    } else {
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (search.length >= 2) {
                      setShowSuggestions(true);
                    }
                  }}
                  className={`bg-black/60 border border-muted/30 text-white rounded px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300 ${
                    isMobile 
                      ? 'w-32 text-sm placeholder:text-xs' 
                      : 'w-64'
                  }`}
                />
                <Button
                  type="submit"
                  data-testid="search-submit"
                  variant="ghost"
                  size={isMobile ? "sm" : "icon"}
                  className={`absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-white ${
                    isMobile ? 'h-7 w-7' : 'h-8 w-8'
                  }`}
                >
                  <Search className={isMobile ? "h-4 w-4" : "h-4 w-4"} />
                </Button>
              </form>

              {/* Search Suggestions */}
              {showSuggestions && debouncedSearch.length >= 2 && (
                <div 
                  data-testid="search-suggestions" 
                  className="search-suggestions absolute top-full left-0 w-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto">
                  {suggestions && suggestions.items && suggestions.items.length > 0 ? (
                    <>
                      {suggestions.items.map((suggestion: SearchSuggestion) => (
                        <Link
                          key={suggestion._id}
                          to={`/movie/${suggestion.slug}`}
                          onClick={() => {
                            setSearch(suggestion.name);
                            setShowSuggestions(false);
                          }}
                          className="flex items-center p-2 hover:bg-accent/50 transition-colors"
                        >
                          {suggestion.thumb_url && (
                            <div className="w-10 h-14 overflow-hidden rounded mr-3 flex-shrink-0">
                              <img
                                src={suggestion.thumb_url}
                                alt={suggestion.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium text-sm text-white truncate">{suggestion.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {suggestion.origin_name} • {suggestion.type === 'single' ? 'Movie' : 'TV Series'}
                            </div>
                          </div>
                        </Link>
                      ))}
                      
                      {/* View all results button */}
                      <div className="p-2 border-t border-border">
                        <Button
                          variant="ghost"
                          className="w-full text-xs text-center text-primary hover:text-primary hover:bg-accent/50"
                          onClick={() => {
                            const trimmedSearch = search.trim();
                            window.location.href = `/search?q=${encodeURIComponent(trimmedSearch)}`;
                            setShowSuggestions(false);
                          }}
                        >
                          <span>View all results</span>
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <p>No results found for "{debouncedSearch}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <Link to="/notifications">
              <Button 
                variant="ghost" 
                size="icon"
                className="relative text-white hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {/* Notification badge - uncomment when you have unread notifications */}
                {/* <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span> */}
              </Button>
            </Link>

            {/* User Menu - Desktop Only */}
            {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center text-white">
                    <Avatar data-testid="user-avatar" className="user-avatar h-8 w-8">
                      <AvatarFallback>
                        {user ? user.username.substring(0, 2).toUpperCase() : "GU"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user ? (
                    <>
                      <DropdownMenuLabel>
                        {user.username}
                        {user.role === 'admin' && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Admin</span>
                        )}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Link to="/profile" className="w-full flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link to="/my-list" className="w-full flex items-center">
                          <BookmarkPlus className="mr-2 h-4 w-4" />
                          My List
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link to="/history" className="w-full flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          Watch History
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link to="/settings" className="w-full flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      {user.role === 'admin' && (
                        <DropdownMenuItem>
                          <Link to="/admin" className="w-full flex items-center">
                            <span className="mr-2 h-4 w-4 flex items-center justify-center">⚙️</span>
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem data-testid="logout" onClick={handleLogout} className="logout-button text-red-500 cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel>Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Link to="/auth" className="w-full flex items-center">
                          Sign In / Register
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
