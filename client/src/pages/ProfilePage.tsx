import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { User, Clock, Film, Edit, Eye, Star, MessageSquare, Lock, LogOut, Bookmark, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import WatchlistGrid from "@/components/WatchlistGrid";
import WatchHistoryStats from "@/components/WatchHistoryStats";
import WatchHistoryList from "@/components/WatchHistoryList";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
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
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Mobile Edit Profile Sheet Content
  const EditProfileContent = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-2">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base"
          placeholder="Enter your display name"
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base resize-none"
          placeholder="Tell us about yourself..."
        ></textarea>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSaveProfile} className="flex-1 h-11">
          Save Changes
        </Button>
        <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 h-11">
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-4 md:py-10 px-4">
      {/* Mobile Header */}
      <div className="md:hidden mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      {/* Desktop Header */}
      <h1 className="hidden md:block text-3xl font-bold mb-8">User Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Profile Summary Card */}
        <Card className="lg:col-span-1 bg-card">
          <CardHeader className="pb-3 md:pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                <AvatarFallback className="text-xl sm:text-2xl bg-primary/20">
                  {user.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 w-full sm:w-auto">
                {!isEditing && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-lg sm:text-xl font-bold">{displayName}</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 h-8 sm:h-9"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <User className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                      {user.username}
                      {user.role === 'admin' && (
                        <Badge variant="outline" className="ml-2 text-xs bg-primary/10">Admin</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{bio}</p>
                  </>
                )}
              </div>
            </div>

            {/* Desktop Inline Edit */}
            {isEditing && !isMobile && (
              <div className="space-y-3 mt-4">
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
                  <Button onClick={handleSaveProfile} size="sm">Save</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">Cancel</Button>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="pb-3 space-y-4">
            {/* User Details */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member since</span>
                <span className="font-medium">{formatDate(user.createdAt || new Date())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate max-w-[60%] sm:max-w-[180px] font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || "User"}</span>
              </div>
            </div>

            <Separator className="my-3 md:my-4" />

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                <div className="flex justify-center mb-1">
                  <Film className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="font-bold text-lg sm:text-xl">{watchlistData.length}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Watchlist</div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                <div className="flex justify-center mb-1">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="font-bold text-lg sm:text-xl">{completedItems}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Completed</div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                <div className="flex justify-center mb-1">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="font-bold text-lg sm:text-xl">{formatTime(totalWatchTime)}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Watched</div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-3">
            <Button
              variant="outline"
              className="w-full h-11 flex items-center justify-center gap-2 text-base"
              onClick={() => navigate("/profile-settings?tab=security")}
            >
              <Lock className="h-4 w-4" />
              Change Password
            </Button>
            <Button
              variant="destructive"
              className="w-full h-11 flex items-center justify-center gap-2 text-base"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </CardFooter>
        </Card>

        {/* Activity and Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto mb-4 md:mb-6">
              <TabsTrigger value="activity" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm">
                <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span>Activity</span>
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm relative">
                <Bookmark className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Watchlist</span>
                <span className="sm:hidden">List</span>
                {watchlistData.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground sm:relative sm:top-0 sm:right-0 sm:ml-1">
                    {watchlistData.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm relative">
                <History className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span>History</span>
                {totalItems > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground sm:relative sm:top-0 sm:right-0 sm:ml-1">
                    {totalItems}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-0">
              <Card>
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="text-lg md:text-xl">Recent Activity</CardTitle>
                  <CardDescription className="text-sm">Your latest interactions on PhimGG</CardDescription>
                </CardHeader>
                <CardContent className="px-3 md:px-6">
                  <div className="space-y-4 md:space-y-6">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex gap-3 md:gap-4 items-start pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="bg-primary/10 rounded-full p-2 shrink-0">
                          {activity.type === "watch" && <Eye className="h-4 w-4 md:h-5 md:w-5 text-primary" />}
                          {activity.type === "rating" && <Star className="h-4 w-4 md:h-5 md:w-5 text-primary" />}
                          {activity.type === "comment" && <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-1">
                            <div className="font-medium text-sm md:text-base truncate">{activity.title}</div>
                            <div className="text-xs text-muted-foreground shrink-0">{activity.date}</div>
                          </div>

                          {activity.type === "watch" && <div className="text-sm text-muted-foreground">Watched this movie</div>}
                          {activity.type === "rating" && (
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-muted-foreground">Rated</div>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-3.5 w-3.5 md:h-4 md:w-4 ${i < (activity.rating || 0) ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                                ))}
                              </div>
                            </div>
                          )}
                          {activity.type === "comment" && <div className="text-sm text-muted-foreground line-clamp-2">"{activity.comment}"</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="watchlist" className="mt-0">
              <Card>
                <CardHeader className="pb-3 md:pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg md:text-xl">My Watchlist</CardTitle>
                      <CardDescription className="text-sm">
                        Movies and shows you want to watch ({watchlistData.length} items)
                      </CardDescription>
                    </div>
                    {!watchlistEmpty && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/my-list")}
                        className="shrink-0 h-8 md:h-9"
                      >
                        <span className="hidden sm:inline">View All</span>
                        <span className="sm:hidden text-xs">All</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-3 md:px-6">
                  {watchlistError ? (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">
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
                    <div className="text-center mt-4 md:mt-6">
                      <Button
                        variant="outline"
                        onClick={() => navigate("/my-list")}
                        className="w-full sm:w-auto h-10 md:h-11"
                      >
                        View All {watchlistData.length} Items
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <Card>
                <CardHeader className="pb-3 md:pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg md:text-xl">Watch History</CardTitle>
                      <CardDescription className="text-sm">
                        Your recent viewing activity ({totalItems} items, {formatTime(totalWatchTime)} watched)
                      </CardDescription>
                    </div>
                    {!historyEmpty && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/watch-history")}
                        className="shrink-0 h-8 md:h-9"
                      >
                        <span className="hidden sm:inline">View All</span>
                        <span className="sm:hidden text-xs">All</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-3 md:px-6">
                  {historyError ? (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">
                        Failed to load your watch history. Please try refreshing the page.
                      </AlertDescription>
                    </Alert>
                  ) : historyEmpty ? (
                    <div className="text-center p-6 md:p-8">
                      <Clock className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground/60 mb-3 md:mb-4" />
                      <h3 className="text-base md:text-lg font-medium mb-2">No watch history yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start watching movies and shows to build your history
                      </p>
                      <Button onClick={() => navigate("/")} className="h-10 md:h-11">Discover Content</Button>
                    </div>
                  ) : (
                    <>
                      {/* Mini stats */}
                      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
                        <div className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
                          <div className="text-lg md:text-2xl font-bold">{formatTime(totalWatchTime)}</div>
                          <div className="text-[10px] md:text-sm text-muted-foreground mt-0.5">Total Time</div>
                        </div>
                        <div className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
                          <div className="text-lg md:text-2xl font-bold">{totalItems}</div>
                          <div className="text-[10px] md:text-sm text-muted-foreground mt-0.5">Items</div>
                        </div>
                        <div className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
                          <div className="text-lg md:text-2xl font-bold">{completedItems}</div>
                          <div className="text-[10px] md:text-sm text-muted-foreground mt-0.5">Completed</div>
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
                        <div className="text-center mt-4 md:mt-6">
                          <Button
                            variant="outline"
                            onClick={() => navigate("/watch-history")}
                            className="w-full sm:w-auto h-10 md:h-11"
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

      {/* Mobile Edit Profile Sheet */}
      {isMobile && (
        <Sheet open={isEditing} onOpenChange={setIsEditing}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader className="text-left mb-6">
              <SheetTitle className="text-xl">Edit Profile</SheetTitle>
              <SheetDescription>
                Update your display name and bio
              </SheetDescription>
            </SheetHeader>
            {EditProfileContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}