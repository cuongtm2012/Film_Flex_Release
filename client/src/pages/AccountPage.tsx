import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useWatchHistory } from "@/hooks/use-watch-history";
import {
    User, Clock, Film, Edit, Eye, Star, MessageSquare, Lock, LogOut,
    Bookmark, History, Bell, Globe, EyeOff, Shield, Settings as SettingsIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import WatchlistGrid from "@/components/WatchlistGrid";
import WatchHistoryStats from "@/components/WatchHistoryStats";
import WatchHistoryList from "@/components/WatchHistoryList";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Schema for password change form
const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

// Schema for notification settings
const notificationSchema = z.object({
    emailNotifications: z.boolean().default(true),
    newEpisodes: z.boolean().default(true),
    newReleases: z.boolean().default(true),
    accountAlerts: z.boolean().default(true),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;
type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function AccountPage() {
    const { user, logoutMutation } = useAuth();
    const { toast } = useToast();
    const [location, navigate] = useLocation();
    const isMobile = useIsMobile();

    // Get tab from URL parameter
    const searchParams = new URLSearchParams(location.split('?')[1]);
    const urlTab = searchParams.get('tab') || 'profile';
    const [activeTab, setActiveTab] = useState(urlTab);

    // Profile editing state
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(user?.username || "");
    const [bio, setBio] = useState("No bio available");
    const [showPassword, setShowPassword] = useState(false);

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

    // Form for password change
    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    // Form for notification settings
    const notificationForm = useForm<NotificationFormValues>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            emailNotifications: true,
            newEpisodes: true,
            newReleases: true,
            accountAlerts: true,
        },
    });

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
        toast({
            title: "Profile updated",
            description: "Your profile information has been updated.",
        });
        setIsEditing(false);
    };

    const handleRemoveFromWatchlist = (movieSlug: string) => {
        removeFromWatchlist.mutate(movieSlug);
    };

    const handleToggleWatched = (movieSlug: string, isWatched: boolean) => {
        toggleWatched.mutate({ movieSlug, isWatched });
    };

    const handleContinueWatching = (slug: string, progress: number) => {
        const timeInSeconds = Math.floor((progress / 100) * 120 * 60);
        navigate(`/movie/${slug}?t=${timeInSeconds}`);
    };

    const handleRemoveFromHistory = (id: number) => {
        removeFromHistory.mutate(id);
    };

    const onPasswordSubmit = (data: PasswordFormValues) => {
        toast({
            title: "Password Changed",
            description: "Your password has been updated successfully.",
        });
        passwordForm.reset();
    };

    const onNotificationSubmit = (data: NotificationFormValues) => {
        toast({
            title: "Settings Saved",
            description: "Your notification preferences have been updated.",
        });
    };

    // Mock data for activity
    const recentActivity = [
        { type: "watch", title: "Stranger Things", date: "2 days ago" },
        { type: "rating", title: "The Dark Knight", rating: 5, date: "1 week ago" },
        { type: "comment", title: "Inception", comment: "Mind-blowing movie!", date: "2 weeks ago" },
    ];

    // Handle tab change and update URL
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        navigate(`/account?tab=${tab}`, { replace: true });
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading account...</p>
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
        <div className="container mx-auto py-4 md:py-10 px-4 pb-20 md:pb-10">
            {/* Header */}
            <div className="mb-4 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold">Account Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your profile, activity, and preferences</p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-auto mb-4 md:mb-6">
                    <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm">
                        <User className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span>Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm">
                        <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span>Activity</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm">
                        <Lock className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span>Security</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm">
                        <Bell className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Notifications</span>
                        <span className="sm:hidden">Notif</span>
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm">
                        <Globe className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Preferences</span>
                        <span className="sm:hidden">Prefs</span>
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                        {/* Profile Card */}
                        <Card className="lg:col-span-1">
                            <CardHeader className="pb-3 md:pb-4">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <ProfileImageUpload />

                                    {!isEditing && (
                                        <>
                                            <div className="w-full">
                                                <div className="flex items-center justify-center gap-2 mb-1">
                                                    <h2 className="text-lg sm:text-xl font-bold">{displayName}</h2>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setIsEditing(true)}
                                                        className="h-8"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="flex items-center justify-center text-sm text-muted-foreground mb-2">
                                                    <User className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                                                    {user.username}
                                                    {user.role === 'admin' && (
                                                        <Badge variant="outline" className="ml-2 text-xs bg-primary/10">Admin</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{bio}</p>
                                            </div>
                                        </>
                                    )}
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

                                <Separator className="my-3 md:my-4" />

                                {/* Logout Button */}
                                <Button
                                    variant="destructive"
                                    className="w-full h-11 flex items-center justify-center gap-2"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Recent Activity Card */}
                        <Card className="lg:col-span-2">
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
                    </div>
                </TabsContent>

                {/* Activity Tab - Watchlist & History */}
                <TabsContent value="activity" className="mt-0">
                    <Tabs defaultValue="watchlist" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="watchlist" className="flex items-center gap-2">
                                <Bookmark className="h-4 w-4" />
                                Watchlist ({watchlistData.length})
                            </TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center gap-2">
                                <History className="h-4 w-4" />
                                History ({totalItems})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="watchlist">
                            <Card>
                                <CardHeader>
                                    <CardTitle>My Watchlist</CardTitle>
                                    <CardDescription>Movies and shows you want to watch</CardDescription>
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
                                            movies={watchlistData}
                                            isLoading={watchlistLoading}
                                            onRemoveMovie={handleRemoveFromWatchlist}
                                            onToggleWatched={handleToggleWatched}
                                            removeLoading={removeFromWatchlist.isPending}
                                            toggleLoading={toggleWatched.isPending}
                                            showWatchedToggle={false}
                                            emptyMessage="Your watchlist is empty"
                                            emptyDescription="Add movies or shows to watch later by clicking the bookmark icon on any title"
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="history">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Watch History</CardTitle>
                                    <CardDescription>
                                        Your recent viewing activity ({totalItems} items, {formatTime(totalWatchTime)} watched)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {historyError ? (
                                        <Alert variant="destructive">
                                            <AlertDescription>
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

                                            <WatchHistoryList
                                                historyByDate={getHistoryByDate(watchHistory)}
                                                isLoading={historyLoading}
                                                onRemoveItem={handleRemoveFromHistory}
                                                onContinueWatching={handleContinueWatching}
                                                removeLoading={removeFromHistory.isPending}
                                            />
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* Security Tab - Password Change */}
                <TabsContent value="security" className="mt-0">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Shield className="h-5 w-5 mr-2 text-primary" />
                                Change Password
                            </CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 md:space-y-6">
                                    <FormField
                                        control={passwordForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Current Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            {...field}
                                                            className="pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>New Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            {...field}
                                                            className="pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={passwordForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirm New Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            {...field}
                                                            className="pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button type="submit" className="w-full">
                                        Change Password
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="mt-0">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Bell className="h-5 w-5 mr-2 text-primary" />
                                Notification Settings
                            </CardTitle>
                            <CardDescription>
                                Manage how you receive notifications and alerts
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...notificationForm}>
                                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4 md:space-y-6">
                                    <FormField
                                        control={notificationForm.control}
                                        name="emailNotifications"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 md:p-4">
                                                <div className="space-y-0.5 pr-4">
                                                    <FormLabel>Email Notifications</FormLabel>
                                                    <FormDescription>
                                                        Receive notifications via email
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <Separator />

                                    <div className="space-y-3 md:space-y-4">
                                        <h3 className="text-base md:text-lg font-medium">Notification Types</h3>

                                        <FormField
                                            control={notificationForm.control}
                                            name="newEpisodes"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between gap-4">
                                                    <div className="space-y-0.5 flex-1">
                                                        <FormLabel>New Episodes</FormLabel>
                                                        <FormDescription>
                                                            Get notified when new episodes of your favorite shows are available
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={notificationForm.control}
                                            name="newReleases"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between gap-4">
                                                    <div className="space-y-0.5 flex-1">
                                                        <FormLabel>New Releases</FormLabel>
                                                        <FormDescription>
                                                            Get notified about new movies matching your interests
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={notificationForm.control}
                                            name="accountAlerts"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between gap-4">
                                                    <div className="space-y-0.5 flex-1">
                                                        <FormLabel>Account Alerts</FormLabel>
                                                        <FormDescription>
                                                            Receive alerts for password changes, new device logins, etc.
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <Button type="submit" className="w-full">
                                        Save Notification Settings
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences" className="mt-0">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <SettingsIcon className="h-5 w-5 mr-2 text-primary" />
                                Preferences
                            </CardTitle>
                            <CardDescription>
                                Customize your viewing experience
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 md:space-y-6">
                                <div className="grid gap-2">
                                    <label className="text-sm md:text-base font-medium">Language</label>
                                    <select className="rounded-md border border-input bg-background px-3 py-2 h-10 md:h-11 text-sm md:text-base">
                                        <option value="en">English</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="de">German</option>
                                        <option value="ja">Japanese</option>
                                    </select>
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm md:text-base font-medium">Subtitle Language</label>
                                    <select className="rounded-md border border-input bg-background px-3 py-2 h-10 md:h-11 text-sm md:text-base">
                                        <option value="en">English</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="de">German</option>
                                        <option value="ja">Japanese</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="text-sm md:text-base font-medium">Autoplay Next Episode</h4>
                                        <p className="text-xs md:text-sm text-muted-foreground">Automatically play the next episode in a series</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="text-sm md:text-base font-medium">Show Mature Content</h4>
                                        <p className="text-xs md:text-sm text-muted-foreground">Include mature or adult content in search results</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>

                            <Button className="mt-4 md:mt-6 w-full">Save Preferences</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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
