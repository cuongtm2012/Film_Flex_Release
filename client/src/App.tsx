import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import MovieDetail from "@/pages/MovieDetail";
import Search from "@/pages/Search";
import AuthPage from "@/pages/auth-page";
import ProfilePageComponent from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import WatchlistPageComponent from "@/pages/WatchlistPage";
import WatchHistoryPage from "@/pages/WatchHistoryPage";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

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
      
      <Route path="/movie/:slug">
        {(params) => (
          <MainLayout>
            <MovieDetail slug={params.slug || ""} />
          </MainLayout>
        )}
      </Route>
      
      <Route path="/search">
        <MainLayout>
          <Search />
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
