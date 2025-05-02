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
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function MainLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

// Pages for protected routes
const ProfilePage = () => <div className="p-8"><h1 className="text-2xl font-bold mb-4">User Profile</h1><p>This is a protected page that requires authentication.</p></div>;
const WatchlistPage = () => <div className="p-8"><h1 className="text-2xl font-bold mb-4">My Watchlist</h1><p>This is a protected page that shows your saved movies.</p></div>;

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
          <ProtectedRoute component={ProfilePage} path="/profile" />
        </MainLayout>
      </Route>
      
      <Route path="/watchlist">
        <MainLayout>
          <ProtectedRoute component={WatchlistPage} path="/watchlist" />
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
