import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import UserManagement from "@/components/admin/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Film,
  Settings,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  AlertCircle,
  Search,
  Plus,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("user-management");

  // Mock data for users
  const mockUsers = [
    { id: 1, username: "admin", email: "admin@filmflex.com", role: "admin", status: "active", lastLogin: "2023-12-25 10:30" },
    { id: 2, username: "moderator1", email: "mod1@filmflex.com", role: "moderator", status: "active", lastLogin: "2023-12-24 14:15" },
    { id: 3, username: "john_doe", email: "john@example.com", role: "user", status: "active", lastLogin: "2023-12-23 09:45" },
    { id: 4, username: "jane_smith", email: "jane@example.com", role: "user", status: "inactive", lastLogin: "2023-12-20 16:22" },
    { id: 5, username: "viewer99", email: "viewer@example.com", role: "user", status: "active", lastLogin: "2023-12-22 11:05" },
  ];

  // Mock data for content
  const mockContent = [
    { id: 1, title: "Stranger Things", type: "series", status: "published", views: 15420, rating: 4.8 },
    { id: 2, title: "The Dark Knight", type: "movie", status: "published", views: 12800, rating: 4.9 },
    { id: 3, title: "Breaking Bad", type: "series", status: "published", views: 14200, rating: 4.9 },
    { id: 4, title: "Interstellar", type: "movie", status: "pending", views: 9800, rating: 4.7 },
    { id: 5, title: "Game of Thrones", type: "series", status: "published", views: 16500, rating: 4.6 },
  ];

  // Mock data for audit logs
  const mockAuditLogs = [
    { id: 1, user: "admin", action: "USER_CREATE", details: "Created new moderator account", timestamp: "2023-12-25 09:15", ip: "192.168.1.1" },
    { id: 2, user: "moderator1", action: "CONTENT_APPROVE", details: "Approved movie 'Interstellar'", timestamp: "2023-12-24 14:30", ip: "192.168.1.2" },
    { id: 3, user: "admin", action: "SETTING_CHANGE", details: "Updated system email template", timestamp: "2023-12-24 10:45", ip: "192.168.1.1" },
    { id: 4, user: "admin", action: "USER_SUSPEND", details: "Suspended user 'bad_actor123'", timestamp: "2023-12-23 16:20", ip: "192.168.1.1" },
    { id: 5, user: "moderator1", action: "CONTENT_DELETE", details: "Deleted inappropriate comment", timestamp: "2023-12-22 11:35", ip: "192.168.1.2" },
  ];

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-20 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="mb-4">You don't have permission to access the admin panel.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-4"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Site
        </Button>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-3 lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2 mt-2">
                <Button 
                  variant={activeTab === "user-management" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("user-management")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  User Management
                </Button>
                <Button 
                  variant={activeTab === "content-management" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("content-management")}
                >
                  <Film className="mr-2 h-4 w-4" />
                  Content Management
                </Button>
                <Button 
                  variant={activeTab === "system-settings" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("system-settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  System Settings
                </Button>
                <Button 
                  variant={activeTab === "analytics" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("analytics")}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Button>
                <Button 
                  variant={activeTab === "security" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("security")}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Security
                </Button>

                <Button 
                  variant={activeTab === "audit-logs" ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("audit-logs")}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Audit Logs
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6">
          {/* User Management */}
          {activeTab === "user-management" && (
            <>
              <UserManagement />
            </>
          )}

          {/* Content Management */}
          {activeTab === "content-management" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Content Management</CardTitle>
                  <CardDescription>Manage movies, series, and other content on the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search content..." className="pl-10" />
                    </div>
                    <div className="flex gap-2">
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="movie">Movies</SelectItem>
                          <SelectItem value="series">Series</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button>
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                      </Button>
                    </div>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Content
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-2 text-left font-medium">ID</th>
                          <th className="py-3 px-2 text-left font-medium">Title</th>
                          <th className="py-3 px-2 text-left font-medium">Type</th>
                          <th className="py-3 px-2 text-left font-medium">Status</th>
                          <th className="py-3 px-2 text-left font-medium">Views</th>
                          <th className="py-3 px-2 text-left font-medium">Rating</th>
                          <th className="py-3 px-2 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockContent.map((content) => (
                          <tr key={content.id} className="border-b">
                            <td className="py-4 px-2">{content.id}</td>
                            <td className="py-4 px-2 font-medium">{content.title}</td>
                            <td className="py-4 px-2">
                              <Badge variant={content.type === "movie" ? "default" : "secondary"}>
                                {content.type}
                              </Badge>
                            </td>
                            <td className="py-4 px-2">
                              <Badge 
                                variant={
                                  content.status === "published" ? "success" : 
                                  content.status === "pending" ? "warning" : "outline"
                                }
                              >
                                {content.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-2">{content.views.toLocaleString()}</td>
                            <td className="py-4 px-2">{content.rating}/5.0</td>
                            <td className="py-4 px-2">
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">Edit</Button>
                                <Button variant="outline" size="sm">Preview</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing 1-5 of 5 items
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled>Previous</Button>
                      <Button variant="outline" size="sm" disabled>Next</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content Approval</CardTitle>
                    <CardDescription>Review and approve new content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 border rounded-md">
                        <div className="flex justify-between mb-2">
                          <div className="font-medium">Interstellar</div>
                          <Badge variant="warning">Pending</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">Submitted by: content_editor</div>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="default">Approve</Button>
                          <Button size="sm" variant="outline">Reject</Button>
                        </div>
                      </div>
                      <div className="p-3 border rounded-md">
                        <div className="flex justify-between mb-2">
                          <div className="font-medium">The Witcher S3</div>
                          <Badge variant="warning">Pending</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">Submitted by: netflix_admin</div>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="default">Approve</Button>
                          <Button size="sm" variant="outline">Reject</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Content Categories</CardTitle>
                    <CardDescription>Manage content categories and tags</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col space-y-2 mb-4">
                      <label className="text-sm font-medium">Create Category</label>
                      <div className="flex gap-2">
                        <Input placeholder="New category name" />
                        <Button>Add</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 border rounded">
                        <div>Action</div>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </div>
                      <div className="flex justify-between items-center p-2 border rounded">
                        <div>Comedy</div>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </div>
                      <div className="flex justify-between items-center p-2 border rounded">
                        <div>Drama</div>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </div>
                      <div className="flex justify-between items-center p-2 border rounded">
                        <div>Sci-Fi</div>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Content Guidelines</CardTitle>
                    <CardDescription>Set content standards and guidelines</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Age Rating Requirements</div>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          All content must have appropriate age ratings
                        </div>
                      </div>
                      <Separator />
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Content Quality Standards</div>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Minimum video quality: 720p, clear audio required
                        </div>
                      </div>
                      <Separator />
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Prohibited Content</div>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Guidelines for content that violates platform terms
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* System Settings */}
          {activeTab === "system-settings" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure platform-wide settings including notifications and branding</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="general">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="emails">Email Templates</TabsTrigger>
                      <TabsTrigger value="themes">Theme Settings</TabsTrigger>
                      <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="space-y-6 pt-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Platform Settings</h3>
                          <div className="flex justify-between items-center border p-4 rounded-md">
                            <div>
                              <div className="font-medium">Maintenance Mode</div>
                              <div className="text-sm text-muted-foreground">
                                Enable maintenance mode to prevent user access
                              </div>
                            </div>
                            <Switch />
                          </div>
                          
                          <div className="flex justify-between items-center border p-4 rounded-md">
                            <div>
                              <div className="font-medium">User Registration</div>
                              <div className="text-sm text-muted-foreground">
                                Allow new user registrations
                              </div>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          
                          <div className="flex justify-between items-center border p-4 rounded-md">
                            <div>
                              <div className="font-medium">Content Moderation</div>
                              <div className="text-sm text-muted-foreground">
                                Enable manual review for user-submitted content
                              </div>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Cache Settings</h3>
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Clear Application Cache</div>
                                <div className="text-sm text-muted-foreground">
                                  Last cleared: 2 days ago
                                </div>
                              </div>
                              <Button>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Clear Cache
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Cache Expiry (hours)</div>
                                <div className="text-sm text-muted-foreground">
                                  How long to cache API responses
                                </div>
                              </div>
                              <div className="w-32">
                                <Input type="number" defaultValue="24" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="emails" className="space-y-6 pt-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Email Templates</h3>
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Welcome Email</div>
                                <div className="text-sm text-muted-foreground">
                                  Sent when new users register
                                </div>
                              </div>
                              <Button variant="outline">Edit Template</Button>
                            </div>
                            
                            <div className="flex items-center justify-between border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Password Reset</div>
                                <div className="text-sm text-muted-foreground">
                                  Sent when users request password reset
                                </div>
                              </div>
                              <Button variant="outline">Edit Template</Button>
                            </div>
                            
                            <div className="flex items-center justify-between border p-4 rounded-md">
                              <div>
                                <div className="font-medium">New Content Alert</div>
                                <div className="text-sm text-muted-foreground">
                                  Sent when new content is available
                                </div>
                              </div>
                              <Button variant="outline">Edit Template</Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Email Settings</h3>
                          <div className="grid gap-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP Server</label>
                                <Input placeholder="smtp.example.com" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP Port</label>
                                <Input type="number" placeholder="587" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Email From</label>
                                <Input placeholder="noreply@filmflex.com" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Reply-To Email</label>
                                <Input placeholder="support@filmflex.com" />
                              </div>
                            </div>
                            <Button className="mt-2">Save Email Settings</Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="themes" className="space-y-6 pt-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Theme Configuration</h3>
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Primary Color</label>
                              <div className="flex gap-2">
                                <div className="w-8 h-8 rounded bg-primary"></div>
                                <Input type="text" defaultValue="#0070f3" />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Logo</label>
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 border rounded flex items-center justify-center font-bold text-xl">
                                  FF
                                </div>
                                <Button variant="outline">Upload New Logo</Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Default Theme</label>
                              <Select defaultValue="dark">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="light">Light Theme</SelectItem>
                                  <SelectItem value="dark">Dark Theme</SelectItem>
                                  <SelectItem value="system">System Preference</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Allow User Theme Selection</div>
                                <div className="text-sm text-muted-foreground">
                                  Users can choose their preferred theme
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            
                            <Button>Save Theme Settings</Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="integrations" className="space-y-6 pt-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">API Integrations</h3>
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between border p-4 rounded-md">
                              <div>
                                <div className="font-medium">TMDB Integration</div>
                                <div className="text-sm text-muted-foreground">
                                  The Movie Database API for movie information
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="success">Connected</Badge>
                                <Button variant="outline" size="sm">Configure</Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between border p-4 rounded-md">
                              <div>
                                <div className="font-medium">PayPal Integration</div>
                                <div className="text-sm text-muted-foreground">
                                  Payment processing with PayPal
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Disconnected</Badge>
                                <Button variant="outline" size="sm">Connect</Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Google Analytics</div>
                                <div className="text-sm text-muted-foreground">
                                  Track user behavior and site metrics
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="success">Connected</Badge>
                                <Button variant="outline" size="sm">Configure</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Add New Integration</h3>
                          <div className="grid gap-4">
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select integration type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="payment">Payment Gateway</SelectItem>
                                <SelectItem value="analytics">Analytics Service</SelectItem>
                                <SelectItem value="content">Content Provider</SelectItem>
                                <SelectItem value="social">Social Media</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button>Add Integration</Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}

          {/* Analytics */}
          {activeTab === "analytics" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>View platform usage, revenue, and growth metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">28.5K</div>
                        <p className="text-xs text-muted-foreground">Total Users</p>
                        <div className="text-xs text-green-500 mt-2">
                          +12.4% from last month
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">186K</div>
                        <p className="text-xs text-muted-foreground">Total Views</p>
                        <div className="text-xs text-green-500 mt-2">
                          +5.8% from last month
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">$28.4K</div>
                        <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                        <div className="text-xs text-green-500 mt-2">
                          +18.2% from last month
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">4.7/5</div>
                        <p className="text-xs text-muted-foreground">Average Rating</p>
                        <div className="text-xs text-green-500 mt-2">
                          +0.3 from last month
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="border rounded-md p-6 mb-6">
                    <h3 className="font-medium mb-4">User Growth</h3>
                    <div className="h-64 flex items-center justify-center bg-muted/20 rounded">
                      <p className="text-muted-foreground">Graph visualization would be here</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-md p-6">
                      <h3 className="font-medium mb-4">Most Watched Content</h3>
                      <div className="space-y-4">
                        {mockContent.slice(0, 3).map((content) => (
                          <div key={content.id} className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{content.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {content.views.toLocaleString()} views
                              </div>
                            </div>
                            <Badge variant={content.type === "movie" ? "default" : "secondary"}>
                              {content.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border rounded-md p-6">
                      <h3 className="font-medium mb-4">User Demographics</h3>
                      <div className="h-48 flex items-center justify-center bg-muted/20 rounded">
                        <p className="text-muted-foreground">Demographics chart would be here</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Reports</CardTitle>
                    <CardDescription>Generate and schedule custom reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Report Type</label>
                        <Select defaultValue="user-activity">
                          <SelectTrigger>
                            <SelectValue placeholder="Select report type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user-activity">User Activity Report</SelectItem>
                            <SelectItem value="content-performance">Content Performance</SelectItem>
                            <SelectItem value="revenue">Revenue Analysis</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Date Range</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="date" />
                          <Input type="date" />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Format</label>
                        <Select defaultValue="csv">
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="xlsx">Excel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button className="w-full">Generate Report</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Reports</CardTitle>
                    <CardDescription>Manage your scheduled reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 border rounded-md">
                        <div>
                          <div className="font-medium">Weekly User Activity</div>
                          <div className="text-sm text-muted-foreground">Every Monday at 9:00 AM</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Active</Badge>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 border rounded-md">
                        <div>
                          <div className="font-medium">Monthly Revenue Report</div>
                          <div className="text-sm text-muted-foreground">1st of each month</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Active</Badge>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 border rounded-md">
                        <div>
                          <div className="font-medium">Content Performance</div>
                          <div className="text-sm text-muted-foreground">Every Friday at 5:00 PM</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Active</Badge>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Scheduled Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Configure security and compliance settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="authentication">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="authentication">Authentication</TabsTrigger>
                      <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
                      <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="authentication" className="space-y-6 pt-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Password Policies</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Minimum Password Length</div>
                                <div className="text-sm text-muted-foreground">
                                  Minimum characters required for passwords
                                </div>
                              </div>
                              <div className="w-20">
                                <Input type="number" defaultValue="8" min="6" max="24" />
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Password Complexity</div>
                                <div className="text-sm text-muted-foreground">
                                  Require uppercase, lowercase, numbers, and special characters
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Password Expiry</div>
                                <div className="text-sm text-muted-foreground">
                                  Force password changes every 90 days
                                </div>
                              </div>
                              <Switch />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Enable 2FA</div>
                                <div className="text-sm text-muted-foreground">
                                  Require two-factor authentication for all admin users
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">2FA Methods</div>
                                <div className="text-sm text-muted-foreground">
                                  Select available authentication methods
                                </div>
                              </div>
                              <Button variant="outline">Configure</Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Login Attempts</h3>
                          <div className="flex justify-between items-center border p-4 rounded-md">
                            <div>
                              <div className="font-medium">Login Lockout</div>
                              <div className="text-sm text-muted-foreground">
                                Lock account after 5 failed attempts
                              </div>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="privacy" className="space-y-6 pt-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Data Retention</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">User Data Retention</div>
                                <div className="text-sm text-muted-foreground">
                                  How long to keep inactive user data (months)
                                </div>
                              </div>
                              <div className="w-20">
                                <Input type="number" defaultValue="24" />
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Activity Logs Retention</div>
                                <div className="text-sm text-muted-foreground">
                                  How long to keep activity logs (months)
                                </div>
                              </div>
                              <div className="w-20">
                                <Input type="number" defaultValue="12" />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Cookie & Privacy Settings</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Cookie Consent</div>
                                <div className="text-sm text-muted-foreground">
                                  Require cookie consent banner
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Privacy Policy</div>
                                <div className="text-sm text-muted-foreground">
                                  Last updated: Dec 12, 2023
                                </div>
                              </div>
                              <Button variant="outline">Update</Button>
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Terms of Service</div>
                                <div className="text-sm text-muted-foreground">
                                  Last updated: Nov 30, 2023
                                </div>
                              </div>
                              <Button variant="outline">Update</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="monitoring" className="space-y-6 pt-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Security Monitoring</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Admin Login Alerts</div>
                                <div className="text-sm text-muted-foreground">
                                  Send alerts for admin account logins
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">Suspicious Activity Detection</div>
                                <div className="text-sm text-muted-foreground">
                                  Alert on potentially malicious activities
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            
                            <div className="flex justify-between items-center border p-4 rounded-md">
                              <div>
                                <div className="font-medium">IP Restrictions</div>
                                <div className="text-sm text-muted-foreground">
                                  Limit admin access to specific IP ranges
                                </div>
                              </div>
                              <Button variant="outline">Configure</Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Security Alerts Recipients</h3>
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 border p-4 rounded-md">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>A</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">admin@filmflex.com</div>
                                <div className="text-sm text-muted-foreground">All alerts</div>
                              </div>
                              <Button variant="ghost" size="sm">Remove</Button>
                            </div>
                            
                            <div className="flex items-center gap-2 border p-4 rounded-md">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>S</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">security@filmflex.com</div>
                                <div className="text-sm text-muted-foreground">High priority only</div>
                              </div>
                              <Button variant="ghost" size="sm">Remove</Button>
                            </div>
                            
                            <Button variant="outline" className="w-full">
                              <Plus className="mr-2 h-4 w-4" />
                              Add Recipient
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}

          {/* Audit Logs */}
          {activeTab === "audit-logs" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs</CardTitle>
                  <CardDescription>View system activity and security events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search audit logs..." className="pl-10" />
                    </div>
                    <div className="flex gap-2">
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Action type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Actions</SelectItem>
                          <SelectItem value="user">User Actions</SelectItem>
                          <SelectItem value="content">Content Actions</SelectItem>
                          <SelectItem value="system">System Actions</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button>
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                      </Button>
                    </div>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-2 text-left font-medium">ID</th>
                          <th className="py-3 px-2 text-left font-medium">User</th>
                          <th className="py-3 px-2 text-left font-medium">Action</th>
                          <th className="py-3 px-2 text-left font-medium">Details</th>
                          <th className="py-3 px-2 text-left font-medium">Timestamp</th>
                          <th className="py-3 px-2 text-left font-medium">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockAuditLogs.map((log) => (
                          <tr key={log.id} className="border-b">
                            <td className="py-4 px-2">{log.id}</td>
                            <td className="py-4 px-2 font-medium">{log.user}</td>
                            <td className="py-4 px-2">
                              <Badge 
                                variant={
                                  log.action.startsWith("USER") ? "default" : 
                                  log.action.startsWith("CONTENT") ? "secondary" : 
                                  "outline"
                                }
                              >
                                {log.action}
                              </Badge>
                            </td>
                            <td className="py-4 px-2">{log.details}</td>
                            <td className="py-4 px-2">{log.timestamp}</td>
                            <td className="py-4 px-2">{log.ip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing 1-5 of 5 entries
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled>Previous</Button>
                      <Button variant="outline" size="sm" disabled>Next</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Audit Settings</CardTitle>
                    <CardDescription>Configure audit logging preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Events to Log</label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="log-user" defaultChecked />
                            <label htmlFor="log-user">User Management Events</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="log-content" defaultChecked />
                            <label htmlFor="log-content">Content Management Events</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="log-settings" defaultChecked />
                            <label htmlFor="log-settings">System Settings Changes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="log-login" defaultChecked />
                            <label htmlFor="log-login">Login/Logout Events</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="log-view" />
                            <label htmlFor="log-view">Content View Events</label>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Retention Period (days)</label>
                        <Input type="number" defaultValue="365" />
                      </div>

                      <Button>Save Audit Settings</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                    <CardDescription>Recent activity highlights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium">Today's Activities</div>
                        <Badge>8 events</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 rounded-md bg-muted/20">
                          <div className="text-sm">User logins</div>
                          <div className="font-medium">3</div>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-md bg-muted/20">
                          <div className="text-sm">Content changes</div>
                          <div className="font-medium">2</div>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-md bg-muted/20">
                          <div className="text-sm">System settings</div>
                          <div className="font-medium">1</div>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-md bg-muted/20">
                          <div className="text-sm">Security alerts</div>
                          <div className="font-medium">2</div>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <div className="text-sm font-medium">Most Active Admin</div>
                        <Badge variant="outline">admin</Badge>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm font-medium">Most Common Action</div>
                        <Badge variant="secondary">CONTENT_UPDATE</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}