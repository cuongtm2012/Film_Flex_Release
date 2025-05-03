import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Film, Home, Menu, TrendingUp, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MainHeader() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Home", path: "/", icon: <Home className="h-4 w-4 mr-2" /> },
    { name: "Movies", path: "/movies", icon: <Film className="h-4 w-4 mr-2" /> },
    { name: "News & Popular", path: "/news", icon: <TrendingUp className="h-4 w-4 mr-2" /> },
  ];

  // Add My List item only if user is logged in
  if (user) {
    navItems.push({ 
      name: "My List", 
      path: "/my-list", 
      icon: <User className="h-4 w-4 mr-2" /> 
    });
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent cursor-pointer">
                FilmFlex
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.name} href={item.path}>
                <div
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                    location === item.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                  {item.name}
                </div>
              </Link>
            ))}

            {/* Show Login/Sign Up button if user is not logged in */}
            {!user && (
              <Link href="/auth">
                <Button size="sm" variant="default">
                  Login / Sign Up
                </Button>
              </Link>
            )}

            {/* User profile button if logged in */}
            {user && (
              <Link href="/profile">
                <Button
                  variant="ghost"
                  className="rounded-full w-9 h-9 p-0 border"
                >
                  <span className="sr-only">User profile</span>
                  <span className="font-semibold text-base">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navItems.map((item) => (
              <Link key={item.name} href={item.path}>
                <div
                  className={cn(
                    "flex items-center py-2 px-3 text-base font-medium rounded-md cursor-pointer",
                    location === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  {item.name}
                </div>
              </Link>
            ))}

            {/* Show Login/Sign Up button if user is not logged in */}
            {!user && (
              <Link href="/auth">
                <div
                  className="flex items-center py-2 px-3 text-base font-medium rounded-md bg-primary text-primary-foreground cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login / Sign Up
                </div>
              </Link>
            )}

            {/* User profile link if logged in */}
            {user && (
              <Link href="/profile">
                <div
                  className="flex items-center py-2 px-3 text-base font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}