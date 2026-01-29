import React, { Suspense, lazy } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { logger } from "@/lib/logger";
import { preloadCriticalRoutes } from "@/lib/preload-routes";

// Eager load critical components (needed immediately)
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import SplashScreen from "@/components/SplashScreen";

// Lazy load all pages for better code splitting
const Home = lazy(() => import("@/pages/Home"));
const MovieDetail = lazy(() => import("@/pages/MovieDetail"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Auth pages
const AuthPage = lazy(() => import("@/pages/auth-page"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));

// User pages
const ProfilePageComponent = lazy(() => import("@/pages/ProfilePage"));
const ProfileSettingsPage = lazy(() => import("@/pages/ProfileSettingsPage"));
const WatchlistPageComponent = lazy(() => import("@/pages/WatchlistPage"));
const WatchHistoryPage = lazy(() => import("@/pages/WatchHistoryPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));

// Content pages
const MoviesPage = lazy(() => import("@/pages/MoviesPage"));
const TVShowsPage = lazy(() => import("@/pages/TVShowsPage"));
const NewsPage = lazy(() => import("@/pages/NewsPage"));
const MyListPage = lazy(() => import("@/pages/MyListPage"));
const NewReleasesPage = lazy(() => import("@/pages/NewReleasesPage"));
const TopRatedPage = lazy(() => import("@/pages/TopRatedPage"));
const GenresPage = lazy(() => import("@/pages/GenresPage"));

// Admin
const AdminPage = lazy(() => import("@/pages/AdminPage"));

// Footer pages (least priority - rarely visited)
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const FAQsPage = lazy(() => import("@/pages/FAQsPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const HowToWatchPage = lazy(() => import("@/pages/HowToWatchPage"));
const DevicesPage = lazy(() => import("@/pages/DevicesPage"));
const CareersPage = lazy(() => import("@/pages/CareersPage"));
const PressPage = lazy(() => import("@/pages/PressPage"));
const BlogPage = lazy(() => import("@/pages/BlogPage"));
const PartnersPage = lazy(() => import("@/pages/PartnersPage"));

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

// Loading fallback component
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <svg 
          className="animate-spin h-12 w-12 text-primary" 
          viewBox="0 0 24 24"
          aria-label="Loading"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4" 
            fill="none" 
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" 
          />
        </svg>
        <p className="text-muted-foreground text-sm">Đang tải...</p>
      </div>
    </div>
  );
}

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
            <Suspense fallback={<PageLoadingFallback />}>
              <AuthPage />
            </Suspense>
          </ErrorBoundary>
        </Route>
        
        <Route path="/forgot-password">
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <ForgotPasswordPage />
            </Suspense>
          </ErrorBoundary>
        </Route>
        
        <Route path="/reset-password">
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <ResetPasswordPage />
            </Suspense>
          </ErrorBoundary>
        </Route>
        
        <Route path="/">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <Home />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        {/* Main menu routes */}
        <Route path="/movies">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <MoviesPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/news">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <NewsPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/my-list">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ProtectedRoute component={MyListPage} path="/my-list" />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/movie/:slug">
          {(params) => (
            <ErrorBoundary>
              <MainLayout>
                <Suspense fallback={<PageLoadingFallback />}>
                  <MovieDetail slug={params.slug || ""} />
                </Suspense>
              </MainLayout>
            </ErrorBoundary>
          )}
        </Route>
        
        <Route path="/search">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <SearchPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        {/* Protected routes */}
        <Route path="/profile">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ProtectedRoute component={ProfilePageComponent} path="/profile" />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/settings">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ProtectedRoute component={ProfileSettingsPage} path="/settings" />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/watchlist">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ProtectedRoute component={WatchlistPageComponent} path="/watchlist" />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/history">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ProtectedRoute component={WatchHistoryPage} path="/history" />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>

        <Route path="/notifications">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <NotificationsPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/admin">
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              {/* Admin page has its own layout with Sidebar - no MainLayout/Navbar */}
              <ProtectedRoute component={AdminPage} path="/admin" />
            </Suspense>
          </ErrorBoundary>
        </Route>
        
        {/* Footer pages */}
        <Route path="/about">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <AboutPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/faqs">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <FAQsPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/terms">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <TermsPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/tv">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <TVShowsPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/new-releases">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <NewReleasesPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/top-rated">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <TopRatedPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/genres">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <GenresPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/contact">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ContactPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/how-to-watch">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <HowToWatchPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/devices">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <DevicesPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>

        <Route path="/careers">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <CareersPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/press">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <PressPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/blog">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <BlogPage />
              </Suspense>
            </MainLayout>
          </ErrorBoundary>
        </Route>
        
        <Route path="/partners">
          <ErrorBoundary>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <PartnersPage />
              </Suspense>
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
                    <PageLoadingFallback />
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
              <Suspense fallback={<PageLoadingFallback />}>
                <NotFound />
              </Suspense>
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
    
    // Preload critical routes for faster navigation
    if (!showSplash) {
      // Only preload after splash screen is dismissed
      preloadCriticalRoutes();
    }
    
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
