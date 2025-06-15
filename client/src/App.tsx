import React from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from 'react-helmet-async';
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import MovieDetail from "@/pages/MovieDetail";
import SearchPage from "@/pages/SearchPage";
import AuthPage from "@/pages/auth-page";
import ProfilePageComponent from "@/pages/ProfilePage";
import WatchlistPageComponent from "@/pages/WatchlistPage";
import WatchHistoryPage from "@/pages/WatchHistoryPage";
import AdminPage from "@/pages/AdminPage";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import ErrorBoundary from "@/components/ErrorBoundary";

import MoviesPage from "@/pages/MoviesPage";
import NewsPage from "@/pages/NewsPage";
import MyListPage from "@/pages/MyListPage";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";

// Footer-linked pages
import AboutPage from "@/pages/AboutPage";
import FAQsPage from "@/pages/FAQsPage";
import TermsPage from "@/pages/TermsPage";
import TVShowsPage from "@/pages/TVShowsPage";
import NewReleasesPage from "@/pages/NewReleasesPage";
import TopRatedPage from "@/pages/TopRatedPage";
import GenresPage from "@/pages/GenresPage";
import ContactPage from "@/pages/ContactPage";
import HowToWatchPage from "@/pages/HowToWatchPage";
import DevicesPage from "@/pages/DevicesPage";
import CareersPage from "@/pages/CareersPage";
import PressPage from "@/pages/PressPage";
import BlogPage from "@/pages/BlogPage";
import PartnersPage from "@/pages/PartnersPage";

// Enhanced debugging utilities
const DEBUG_MODE = process.env.NODE_ENV === 'development' || localStorage.getItem('filmflex-debug') === 'true';

// Debug logging function
const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    console.log(`🔍 FilmFlex Debug: ${message}`, data || '');
  }
};

// Component load tracker
const trackComponentLoad = (componentName: string) => {
  debugLog(`Component Loading: ${componentName}`);
  return () => debugLog(`Component Loaded: ${componentName}`);
};

function MainLayout({ children }: { children: React.ReactNode }) {
  React.useEffect(trackComponentLoad('MainLayout'), []);
  return <Layout>{children}</Layout>;
}

function Router() {
  React.useEffect(trackComponentLoad('Router'), []);
  
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/auth">
          <ErrorBoundary>
            <AuthPage />
          </ErrorBoundary>
        </Route>
        
        <Route path="/">
          <ErrorBoundary>
            <MainLayout>
              <Home />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        {/* Main menu routes */}
        <Route path="/movies">
          <ErrorBoundary>
            <MainLayout>
              <MoviesPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/news">
          <ErrorBoundary>
            <MainLayout>
              <NewsPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/my-list">
          <ErrorBoundary>
            <MainLayout>
              <ProtectedRoute component={MyListPage} path="/my-list" />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/movie/:slug">
          {(params) => (
            <ErrorBoundary>
              <MainLayout>
                <MovieDetail slug={params.slug || ""} />
              </MainLayout>
            </ErrorBoundary>
          )}
        </Route>
        
        <Route path="/search">
          <ErrorBoundary>
            <MainLayout>
              <SearchPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        {/* Protected routes */}
        <Route path="/profile">
          <ErrorBoundary>
            <MainLayout>
              <ProtectedRoute component={ProfilePageComponent} path="/profile" />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/settings">
          <ErrorBoundary>
            <MainLayout>
              <ProtectedRoute component={ProfileSettingsPage} path="/settings" />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/watchlist">
          <ErrorBoundary>
            <MainLayout>
              <ProtectedRoute component={WatchlistPageComponent} path="/watchlist" />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/history">
          <ErrorBoundary>
            <MainLayout>
              <ProtectedRoute component={WatchHistoryPage} path="/history" />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/admin">
          <ErrorBoundary>
            <MainLayout>
              <ProtectedRoute component={AdminPage} path="/admin" />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        {/* Footer pages */}
        <Route path="/about">
          <ErrorBoundary>
            <MainLayout>
              <AboutPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/faqs">
          <ErrorBoundary>
            <MainLayout>
              <FAQsPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/terms">
          <ErrorBoundary>
            <MainLayout>
              <TermsPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/tv">
          <ErrorBoundary>
            <MainLayout>
              <TVShowsPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/new-releases">
          <ErrorBoundary>
            <MainLayout>
              <NewReleasesPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/top-rated">
          <ErrorBoundary>
            <MainLayout>
              <TopRatedPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/genres">
          <ErrorBoundary>
            <MainLayout>
              <GenresPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/contact">
          <ErrorBoundary>
            <MainLayout>
              <ContactPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/how-to-watch">
          <ErrorBoundary>
            <MainLayout>
              <HowToWatchPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/devices">
          <ErrorBoundary>
            <MainLayout>
              <DevicesPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>

        <Route path="/careers">
          <ErrorBoundary>
            <MainLayout>
              <CareersPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/press">
          <ErrorBoundary>
            <MainLayout>
              <PressPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/blog">
          <ErrorBoundary>
            <MainLayout>
              <BlogPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/partners">
          <ErrorBoundary>
            <MainLayout>
              <PartnersPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route>
          <ErrorBoundary>
            <MainLayout>
              <NotFound />
            </MainLayout>
          </ErrorBoundary>
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  React.useEffect(() => {
    debugLog('App component mounted');
    
    // Add debugging info to window
    if (DEBUG_MODE) {
      (window as any).filmflexDebug = {
        clearAllCache: () => {
          localStorage.clear();
          sessionStorage.clear();
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }
          location.reload();
        },
        enableDebug: () => {
          localStorage.setItem('filmflex-debug', 'true');
          location.reload();
        },
        disableDebug: () => {
          localStorage.removeItem('filmflex-debug');
          location.reload();
        },
        getAppInfo: () => ({
          userAgent: navigator.userAgent,
          url: location.href,
          localStorage: Object.keys(localStorage),
          sessionStorage: Object.keys(sessionStorage),
          timestamp: new Date().toISOString()
        })
      };
      
      console.log('🔧 Debug utilities available at window.filmflexDebug');
    }
    
    return () => debugLog('App component unmounted');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <HelmetProvider>
            <ErrorBoundary>
              <ThemeProvider defaultTheme="dark" storageKey="filmflex-theme">
                <ErrorBoundary>
                  <AuthProvider>
                    <ErrorBoundary>
                      <TooltipProvider>
                        <ErrorBoundary>
                          <Toaster />
                          <Router />
                        </ErrorBoundary>
                      </TooltipProvider>
                    </ErrorBoundary>
                  </AuthProvider>
                </ErrorBoundary>
              </ThemeProvider>
            </ErrorBoundary>
          </HelmetProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
