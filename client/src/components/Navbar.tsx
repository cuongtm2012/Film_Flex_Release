import React, { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ChevronDown, LogOut, User, Settings, BookmarkPlus, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Navbar() {
  const [search, setSearch] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
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
            {/* Logo */}
            <Link to="/" className="text-primary font-bold text-2xl">
              FilmFlex
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

          <div className="flex items-center space-x-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative group">
              <Input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-black/60 border border-muted/30 text-white rounded px-4 py-1 w-32 md:w-64 focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center text-white">
                  <Avatar className="h-8 w-8">
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
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
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
          </div>
        </div>
      </div>
    </header>
  );
}
