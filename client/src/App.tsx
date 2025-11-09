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
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ProfilePageComponent from "@/pages/ProfilePage";
import WatchlistPageComponent from "@/pages/WatchlistPage";
import WatchHistoryPage from "@/pages/WatchHistoryPage";
import AdminPage from "@/pages/AdminPage";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ErrorBoundary from "@/components/ErrorBoundary";
import SplashScreen from "@/components/SplashScreen";

import MoviesPage from "@/pages/MoviesPage";
import NewsPage from "@/pages/NewsPage";
import MyListPage from "@/pages/MyListPage";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";
import NotificationsPage from "@/pages/NotificationsPage";

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
import { logger } from "@/lib/logger";

// Enhanced debugging utilities
const DEBUG_MODE = process.env.NODE_ENV === 'development' || localStorage.getItem('filmflex-debug') === 'true';

// Debug logging function
const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    logger.log(`🔍 PhimGG Debug: ${message}`, data || '');
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
        
        <Route path="/forgot-password">
          <ErrorBoundary>
            <ForgotPasswordPage />
          </ErrorBoundary>
        </Route>
        
        <Route path="/reset-password">
          <ErrorBoundary>
            <ResetPasswordPage />
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

        <Route path="/notifications">
          <ErrorBoundary>
            <MainLayout>
              <NotificationsPage />
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/admin">
          <ErrorBoundary>
            {/* Admin page has its own layout with Sidebar - no MainLayout/Navbar */}
            <ProtectedRoute component={AdminPage} path="/admin" />
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

        {/* Legacy /account route: redirect to auth when logged out or profile when logged in */}
        <Route path="/account">
          {() => {
            const { user, isLoading } = useAuth();

            if (isLoading) {
              return (
                <ErrorBoundary>
                  <MainLayout>
                    <div className="flex items-center justify-center min-h-screen">
                      <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    </div>
                  </MainLayout>
                </ErrorBoundary>
              );
            }

            return (
              <ErrorBoundary>
                <MainLayout>
                  {user ? <Redirect to="/profile" /> : <Redirect to="/auth" />}
                </MainLayout>
              </ErrorBoundary>
            );
          }}
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
  const [showSplash, setShowSplash] = React.useState(() => {
    // Check if splash screen has been seen before
    const splashData = localStorage.getItem('filmflex-splash-seen');
    
    if (!splashData) {
      debugLog('Splash screen: First time visit - showing splash', { splashData: null });
      return true;
    }
    
    try {
      const { timestamp } = JSON.parse(splashData);
      const daysSinceLastSeen = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      
      // Show splash again after 30 days
      if (daysSinceLastSeen > 30) {
        debugLog('Splash screen: 30+ days passed - showing splash again', { daysSinceLastSeen });
        localStorage.removeItem('filmflex-splash-seen');
        return true;
      }
      
      debugLog('Splash screen: Already seen recently - hiding', { daysSinceLastSeen });
      return false;
    } catch {
      // Invalid data format, show splash
      debugLog('Splash screen: Invalid storage data - showing splash');
      localStorage.removeItem('filmflex-splash-seen');
      return true;
    }
  });

  React.useEffect(() => {
    debugLog('App component mounted', { showSplash });
    
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
        showSplash: () => {
          localStorage.removeItem('filmflex-splash-seen');
          setShowSplash(true);
          debugLog('Force showing splash screen (cleared timestamp)');
        },
        hideSplash: () => {
          const splashData = { timestamp: Date.now(), version: '1.0' };
          localStorage.setItem('filmflex-splash-seen', JSON.stringify(splashData));
          setShowSplash(false);
          debugLog('Force hiding splash screen (set timestamp)');
        },
        checkSplashStatus: () => {
          const splashDataRaw = localStorage.getItem('filmflex-splash-seen');
          let splashData = null;
          let daysSinceLastSeen = null;
          
          if (splashDataRaw) {
            try {
              splashData = JSON.parse(splashDataRaw);
              daysSinceLastSeen = (Date.now() - splashData.timestamp) / (1000 * 60 * 60 * 24);
            } catch {
              splashData = 'Invalid format';
            }
          }
          
          const status = {
            showSplash,
            splashData,
            daysSinceLastSeen: daysSinceLastSeen ? daysSinceLastSeen.toFixed(2) : null,
            willShowAgainIn: daysSinceLastSeen ? (30 - daysSinceLastSeen).toFixed(2) + ' days' : 'N/A',
            localStorage: Object.keys(localStorage)
          };
          logger.log('Splash Status:', status);
          return status;
        },
        getAppInfo: () => ({
          userAgent: navigator.userAgent,
          url: location.href,
          localStorage: Object.keys(localStorage),
          sessionStorage: Object.keys(sessionStorage),
          timestamp: new Date().toISOString()
        })
      };
      
      logger.log('🔧 Debug utilities available at window.filmflexDebug');
      logger.log('🎬 To test splash screen: window.filmflexDebug.showSplash()');
      logger.log('📊 Check splash status: window.filmflexDebug.checkSplashStatus()');
    }
    
    return () => debugLog('App component unmounted');
  }, [showSplash]);

  const handleCloseSplash = () => {
    debugLog('Closing splash screen and saving timestamp');
    
    // Save with timestamp for future reference
    const splashData = {
      timestamp: Date.now(),
      version: '1.0'
    };
    
    localStorage.setItem('filmflex-splash-seen', JSON.stringify(splashData));
    setShowSplash(false);
  };

  // Log current state
  debugLog('App render', { showSplash });

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
                          {showSplash && <SplashScreen onClose={handleCloseSplash} />}
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
