import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import MovieDetail from "@/pages/MovieDetail";
import SearchPage from "@/pages/SearchPage";
import AuthPage from "@/pages/auth-page";
import ProfilePageComponent from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import WatchlistPageComponent from "@/pages/WatchlistPage";
import WatchHistoryPage from "@/pages/WatchHistoryPage";
import AdminPage from "@/pages/AdminPage";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import MoviesPage from "@/pages/MoviesPage";
import NewsPage from "@/pages/NewsPage";
import MyListPage from "@/pages/MyListPage";

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

function MainLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth">
        <AuthPage />
      </Route>
      
      <Route path="/">
        <MainLayout>
          <Home />
        </MainLayout>
      </Route>
      
      {/* Main menu routes */}
      <Route path="/movies">
        <MainLayout>
          <MoviesPage />
        </MainLayout>
      </Route>
      
      <Route path="/news">
        <MainLayout>
          <NewsPage />
        </MainLayout>
      </Route>
      
      <Route path="/my-list">
        <MainLayout>
          <ProtectedRoute component={MyListPage} path="/my-list" />
        </MainLayout>
      </Route>
      
      <Route path="/movie/:slug">
        {(params) => (
          <MainLayout>
            <MovieDetail slug={params.slug || ""} />
          </MainLayout>
        )}
      </Route>
      
      <Route path="/search">
        <MainLayout>
          <SearchPage />
        </MainLayout>
      </Route>
      
      {/* Protected routes */}
      <Route path="/profile">
        <MainLayout>
          <ProtectedRoute component={ProfilePageComponent} path="/profile" />
        </MainLayout>
      </Route>
      
      <Route path="/settings">
        <MainLayout>
          <ProtectedRoute component={SettingsPage} path="/settings" />
        </MainLayout>
      </Route>
      
      <Route path="/watchlist">
        <MainLayout>
          <ProtectedRoute component={WatchlistPageComponent} path="/watchlist" />
        </MainLayout>
      </Route>
      
      <Route path="/history">
        <MainLayout>
          <ProtectedRoute component={WatchHistoryPage} path="/history" />
        </MainLayout>
      </Route>
      
      <Route path="/admin">
        <MainLayout>
          <ProtectedRoute component={AdminPage} path="/admin" />
        </MainLayout>
      </Route>
      
      {/* Footer pages */}
      <Route path="/about">
        <MainLayout>
          <AboutPage />
        </MainLayout>
      </Route>
      
      <Route path="/faqs">
        <MainLayout>
          <FAQsPage />
        </MainLayout>
      </Route>
      
      <Route path="/terms">
        <MainLayout>
          <TermsPage />
        </MainLayout>
      </Route>
      
      <Route path="/tv">
        <MainLayout>
          <TVShowsPage />
        </MainLayout>
      </Route>
      
      <Route path="/new-releases">
        <MainLayout>
          <NewReleasesPage />
        </MainLayout>
      </Route>
      
      <Route path="/top-rated">
        <MainLayout>
          <TopRatedPage />
        </MainLayout>
      </Route>
      
      <Route path="/genres">
        <MainLayout>
          <GenresPage />
        </MainLayout>
      </Route>
      
      <Route path="/contact">
        <MainLayout>
          <ContactPage />
        </MainLayout>
      </Route>
      
      <Route path="/how-to-watch">
        <MainLayout>
          <HowToWatchPage />
        </MainLayout>
      </Route>
      
      <Route path="/devices">
        <MainLayout>
          <DevicesPage />
        </MainLayout>
      </Route>

      <Route path="/careers">
        <MainLayout>
          <CareersPage />
        </MainLayout>
      </Route>
      
      <Route path="/press">
        <MainLayout>
          <PressPage />
        </MainLayout>
      </Route>
      
      <Route path="/blog">
        <MainLayout>
          <BlogPage />
        </MainLayout>
      </Route>
      
      <Route path="/partners">
        <MainLayout>
          <PartnersPage />
        </MainLayout>
      </Route>
      
      <Route>
        <MainLayout>
          <NotFound />
        </MainLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="filmflex-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
