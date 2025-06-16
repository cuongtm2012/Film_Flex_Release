import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { User, Clock, Film, Edit, Eye, Star, MessageSquare, Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import WatchlistGrid from "@/components/WatchlistGrid";
import WatchHistoryStats from "@/components/WatchHistoryStats";
import WatchHistoryList from "@/components/WatchHistoryList";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [bio, setBio] = useState("No bio available");

  // Use the watchlist hook
  const {
    watchlistData,
    isLoading: watchlistLoading,
    isError: watchlistError,
    removeFromWatchlist,
    toggleWatched,
    isEmpty: watchlistEmpty,
  } = useWatchlist();

  // Use the watch history hook
  const {
    history: watchHistory,
    isLoading: historyLoading,
    isError: historyError,
    removeFromHistory,
    totalWatchTime,
    totalItems,
    completedItems,
    getHistoryByDate,
    isEmpty: historyEmpty,
  } = useWatchHistory();

  // Format date for display
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
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

  const handleSaveProfile = () => {
    // In a real app, we would send the updated profile to the server
    toast({
      title: "Profile updated",
      description: "Your profile information has been updated.",
    });
    setIsEditing(false);
  };

  // Handle removing movie from watchlist
  const handleRemoveFromWatchlist = (movieSlug: string) => {
    removeFromWatchlist.mutate(movieSlug);
  };

  // Handle toggling watched status
  const handleToggleWatched = (movieSlug: string, isWatched: boolean) => {
    toggleWatched.mutate({ movieSlug, isWatched });
  };

  // Handle continuing to watch from history
  const handleContinueWatching = (slug: string, progress: number) => {
    const timeInSeconds = Math.floor((progress / 100) * 120 * 60); // Convert to seconds
    navigate(`/movie/${slug}?t=${timeInSeconds}`);
  };

  // Handle removing item from watch history
  const handleRemoveFromHistory = (id: number) => {
    removeFromHistory.mutate(id);
  };

  // Mock data for activity - in a real app, this would come from the API
  const recentActivity = [
    { type: "watch", title: "Stranger Things", date: "2 days ago" },
    { type: "rating", title: "The Dark Knight", rating: 5, date: "1 week ago" },
    { type: "comment", title: "Inception", comment: "Mind-blowing movie!", date: "2 weeks ago" },
  ];

  if (!user) {
    return <div className="p-8 text-center">Loading user profile...</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">User Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Summary Card */}
        <Card className="md:col-span-1 bg-card">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <Avatar className="h-24 w-24 mb-2">
                <AvatarFallback className="text-2xl bg-primary/20">
                  {user.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  ></textarea>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile}>Save</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <CardTitle className="text-xl">{displayName}</CardTitle>
                <CardDescription className="flex items-center">
                  <User className="h-4 w-4 mr-1 opacity-70" />
                  {user.username}
                  {user.role === 'admin' && (
                    <Badge variant="outline" className="ml-2 bg-primary/10">Admin</Badge>
                  )}
                </CardDescription>
                <p className="mt-2 text-sm">{bio}</p>
              </>
            )}
          </CardHeader>
          
          <CardContent className="pb-3">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member since</span>
                <span>{formatDate(user.createdAt || new Date())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate max-w-[180px]">{user.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span>{user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || "User"}</span>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex justify-center">
                  <Film className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-1 font-semibold">{watchlistData.length}</div>
                <div className="text-xs text-muted-foreground">Watchlist</div>
              </div>
              <div>
                <div className="flex justify-center">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-1 font-semibold">{completedItems}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="flex justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-1 font-semibold">{formatTime(totalWatchTime)}</div>
                <div className="text-xs text-muted-foreground">Watched</div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => navigate("/settings")}
            >
              <Lock className="h-4 w-4" />
              Change Password
            </Button>
            <Button 
              variant="destructive" 
              className="w-full flex items-center justify-center gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </CardFooter>
        </Card>
        
        {/* Activity and Details */}
        <div className="md:col-span-2">
          <Tabs defaultValue="activity">
            <TabsList className="mb-6">
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="watchlist" className="relative">
                My Watchlist
                {watchlistData.length > 0 && (
                  <Badge className="ml-2 bg-primary/20 text-primary text-xs">{watchlistData.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="relative">
                Watch History
                {totalItems > 0 && (
                  <Badge className="ml-2 bg-primary/20 text-primary text-xs">{totalItems}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest interactions on FilmFlex</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex gap-4 items-start pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="bg-primary/10 rounded-full p-2">
                          {activity.type === "watch" && <Eye className="h-5 w-5 text-primary" />}
                          {activity.type === "rating" && <Star className="h-5 w-5 text-primary" />}
                          {activity.type === "comment" && <MessageSquare className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <div className="font-medium">{activity.title}</div>
                            <div className="text-xs text-muted-foreground">{activity.date}</div>
                          </div>
                          
                          {activity.type === "watch" && <div className="text-sm">Watched this movie</div>}
                          {activity.type === "rating" && (
                            <div className="flex items-center">
                              <div className="text-sm mr-2">Rated</div>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-4 w-4 ${i < (activity.rating || 0) ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                                ))}
                              </div>
                            </div>
                          )}
                          {activity.type === "comment" && <div className="text-sm">"{activity.comment}"</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="watchlist">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>My Watchlist</CardTitle>
                      <CardDescription>
                        Movies and shows you want to watch ({watchlistData.length} items)
                      </CardDescription>
                    </div>
                    {!watchlistEmpty && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate("/my-list")}
                      >
                        View All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {watchlistError ? (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Failed to load your watchlist. Please try refreshing the page.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <WatchlistGrid
                      movies={watchlistData.slice(0, 6)} // Show only first 6 items in profile
                      isLoading={watchlistLoading}
                      onRemoveMovie={handleRemoveFromWatchlist}
                      onToggleWatched={handleToggleWatched}
                      removeLoading={removeFromWatchlist.isPending}
                      toggleLoading={toggleWatched.isPending}
                      showWatchedToggle={false} // Keep it simple in profile view
                      emptyMessage="Your watchlist is empty"
                      emptyDescription="Add movies or shows to watch later by clicking the bookmark icon on any title"
                      compact={true}
                    />
                  )}
                  {watchlistData.length > 6 && (
                    <div className="text-center mt-6">
                      <Button 
                        variant="outline"
                        onClick={() => navigate("/my-list")}
                      >
                        View All {watchlistData.length} Items
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Watch History</CardTitle>
                      <CardDescription>
                        Your recent viewing activity ({totalItems} items, {formatTime(totalWatchTime)} watched)
                      </CardDescription>
                    </div>
                    {!historyEmpty && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate("/watch-history")}
                      >
                        View All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {historyError ? (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Failed to load your watch history. Please try refreshing the page.
                      </AlertDescription>
                    </Alert>
                  ) : historyEmpty ? (
                    <div className="text-center p-8">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No watch history yet</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Start watching movies and shows to build your history
                      </p>
                      <Button onClick={() => navigate("/")}>Discover Content</Button>
                    </div>
                  ) : (
                    <>
                      {/* Mini stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatTime(totalWatchTime)}</div>
                          <div className="text-sm text-muted-foreground">Total Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{totalItems}</div>
                          <div className="text-sm text-muted-foreground">Items</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{completedItems}</div>
                          <div className="text-sm text-muted-foreground">Completed</div>
                        </div>
                      </div>
                      
                      {/* Recent history items */}
                      <WatchHistoryList
                        historyByDate={getHistoryByDate(watchHistory.slice(0, 4))} // Show only recent 4 items
                        isLoading={historyLoading}
                        onRemoveItem={handleRemoveFromHistory}
                        onContinueWatching={handleContinueWatching}
                        removeLoading={removeFromHistory.isPending}
                      />
                      
                      {watchHistory.length > 4 && (
                        <div className="text-center mt-6">
                          <Button 
                            variant="outline"
                            onClick={() => navigate("/watch-history")}
                          >
                            View All History
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}