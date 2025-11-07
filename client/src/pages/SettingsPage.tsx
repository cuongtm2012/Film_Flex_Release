import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Lock, ArrowLeft, Bell, Globe, Eye, EyeOff, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
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

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [showPassword, setShowPassword] = React.useState(false);
  
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
  
  // Handle password change form submission
  const onPasswordSubmit = (data: PasswordFormValues) => {
    // In a real app, this would call an API to change the password
    
    // Show success message
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
    });
    
    // Reset form
    passwordForm.reset();
  };
  
  // Handle notification settings submission
  const onNotificationSubmit = (data: NotificationFormValues) => {
    // In a real app, this would call an API to update notification settings
    
    // Show success message
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-10 px-4 pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center mb-4 md:mb-8 gap-2">
        <Button 
          variant="ghost" 
          size={isMobile ? "sm" : "default"}
          className="shrink-0"
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft className="h-4 w-4 md:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <h1 className="text-xl md:text-3xl font-bold truncate">Account Settings</h1>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto mb-4 md:mb-6">
            <TabsTrigger 
              value="password" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <Lock className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span>Password</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <Bell className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notif</span>
            </TabsTrigger>
            <TabsTrigger 
              value="preferences" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <Globe className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Preferences</span>
              <span className="sm:hidden">Prefs</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="password" className="mt-0">
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-4 md:px-6 py-4 md:py-6">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <Shield className="h-5 w-5 mr-2 text-primary" />
                  Change Password
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 md:space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm md:text-base">Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                {...field} 
                                className="pr-10 h-10 md:h-11 text-sm md:text-base"
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
                          <FormMessage className="text-xs md:text-sm" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm md:text-base">New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                {...field}
                                className="pr-10 h-10 md:h-11 text-sm md:text-base"
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
                          <FormDescription className="text-xs md:text-sm">
                            Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                          </FormDescription>
                          <FormMessage className="text-xs md:text-sm" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm md:text-base">Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                {...field}
                                className="pr-10 h-10 md:h-11 text-sm md:text-base"
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
                          <FormMessage className="text-xs md:text-sm" />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 text-sm md:text-base font-medium"
                      disabled={isUpdatingPassword}
                    >
                      {isUpdatingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-0">
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-4 md:px-6 py-4 md:py-6">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <Bell className="h-5 w-5 mr-2 text-primary" />
                  Notification Settings
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Manage how you receive notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4 md:space-y-6">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 md:p-4">
                          <div className="space-y-0.5 pr-4">
                            <FormLabel className="text-sm md:text-base">Email Notifications</FormLabel>
                            <FormDescription className="text-xs md:text-sm">
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
                              <FormLabel className="text-sm md:text-base">New Episodes</FormLabel>
                              <FormDescription className="text-xs md:text-sm">
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
                              <FormLabel className="text-sm md:text-base">New Releases</FormLabel>
                              <FormDescription className="text-xs md:text-sm">
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
                              <FormLabel className="text-sm md:text-base">Account Alerts</FormLabel>
                              <FormDescription className="text-xs md:text-sm">
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
                    
                    <Button 
                      type="submit" 
                      className="mt-4 md:mt-6 w-full h-11 text-sm md:text-base font-medium"
                    >
                      Save Notification Settings
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences" className="mt-0">
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-4 md:px-6 py-4 md:py-6">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <UserIcon className="h-5 w-5 mr-2 text-primary" />
                  Preferences
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Customize your viewing experience
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
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
                
                <Button className="mt-4 md:mt-6 w-full h-11 text-sm md:text-base font-medium">Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}