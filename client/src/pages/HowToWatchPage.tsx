import React from "react";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Tv, 
  Laptop, 
  Gamepad, 
  Cast,
  PlayCircle,
  Lightbulb,
  Wifi,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const HowToWatchPage = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header section */}
      <div className="text-center mb-16">
        <PlayCircle className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-3">How to Watch PhimGG</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Enjoy your favorite movies and shows on any device, anytime, anywhere.
        </p>
      </div>

      {/* Devices section */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Watch on Your Favorite Devices</h2>
        
        <Tabs defaultValue="tv" className="max-w-4xl mx-auto">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto mb-8">
            <TabsTrigger value="tv" className="flex flex-col items-center py-3 px-4 h-auto gap-2">
              <Tv className="h-6 w-6" />
              <span className="text-xs">Smart TVs</span>
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex flex-col items-center py-3 px-4 h-auto gap-2">
              <Smartphone className="h-6 w-6" />
              <span className="text-xs">Mobile</span>
            </TabsTrigger>
            <TabsTrigger value="tablet" className="flex flex-col items-center py-3 px-4 h-auto gap-2">
              <Tablet className="h-6 w-6" />
              <span className="text-xs">Tablet</span>
            </TabsTrigger>
            <TabsTrigger value="computer" className="flex flex-col items-center py-3 px-4 h-auto gap-2">
              <Laptop className="h-6 w-6" />
              <span className="text-xs">Computer</span>
            </TabsTrigger>
            <TabsTrigger value="console" className="flex flex-col items-center py-3 px-4 h-auto gap-2">
              <Gamepad className="h-6 w-6" />
              <span className="text-xs">Game Console</span>
            </TabsTrigger>
            <TabsTrigger value="streaming" className="flex flex-col items-center py-3 px-4 h-auto gap-2">
              <Cast className="h-6 w-6" />
              <span className="text-xs">Streaming</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tv" className="border border-gray-800 rounded-xl p-6 bg-black/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-xl font-bold mb-4">Smart TVs</h3>
                <p className="text-muted-foreground mb-6">
                  PhimGG is compatible with a wide range of Smart TVs, offering a seamless viewing experience on the big screen.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Samsung Smart TVs (2018 or newer)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>LG Smart TVs (WebOS 4.0 or higher)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Sony Smart TVs (Android TV)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Hisense Smart TVs (VIDAA OS)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>TCL Smart TVs (Roku TV)</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Button asChild>
                    <a href="/faqs">Learn More</a>
                  </Button>
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-8 text-center">
                <Tv className="h-24 w-24 mx-auto mb-4 text-primary" />
                <h4 className="text-lg font-semibold mb-2">Getting Started</h4>
                <ol className="text-sm text-muted-foreground text-left space-y-3">
                  <li className="border-b border-gray-800 pb-3">1. Search for "PhimGG" in your TV's app store</li>
                  <li className="border-b border-gray-800 pb-3">2. Download and install the PhimGG app</li>
                  <li className="border-b border-gray-800 pb-3">3. Open the app and sign in with your account</li>
                  <li>4. Start streaming your favorite content</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mobile" className="border border-gray-800 rounded-xl p-6 bg-black/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-xl font-bold mb-4">Mobile Devices</h3>
                <p className="text-muted-foreground mb-6">
                  Take PhimGG with you wherever you go on your smartphone. Download content to watch offline during your commute or travels.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>iPhone running iOS 13.0 or later</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Android phones running Android 7.0 or higher</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Download content for offline viewing</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Cast to compatible devices</span>
                  </li>
                </ul>
                <div className="mt-6 flex gap-3">
                  <Button variant="outline" asChild>
                    <a href="https://play.google.com" target="_blank" rel="noopener noreferrer">Get on Android</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">Get on iOS</a>
                  </Button>
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-8 text-center">
                <Smartphone className="h-24 w-24 mx-auto mb-4 text-primary" />
                <h4 className="text-lg font-semibold mb-2">Mobile Features</h4>
                <ul className="text-sm text-muted-foreground text-left space-y-3">
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Offline Downloads:</span> Watch without internet connection
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Mobile Data Saver:</span> Reduce data usage while streaming
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Picture-in-Picture:</span> Watch while using other apps
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Push Notifications:</span> Get alerts for new releases
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tablet" className="border border-gray-800 rounded-xl p-6 bg-black/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-xl font-bold mb-4">Tablets</h3>
                <p className="text-muted-foreground mb-6">
                  Enjoy PhimGG on the larger screen of your tablet for a more immersive experience, perfect for traveling or relaxing at home.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>iPad running iOS 13.0 or later</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Android tablets running Android 7.0 or higher</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Amazon Fire tablets (Fire OS 5 or later)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Windows tablets with Windows 10 or later</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Button asChild>
                    <a href="/devices">View Compatible Devices</a>
                  </Button>
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-8 text-center">
                <Tablet className="h-24 w-24 mx-auto mb-4 text-primary" />
                <h4 className="text-lg font-semibold mb-2">Tablet Optimization</h4>
                <ul className="text-sm text-muted-foreground text-left space-y-3">
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">HD Quality:</span> Enhanced resolution for larger screens
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Split View:</span> Use PhimGG alongside other apps
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Landscape Mode:</span> Optimized interface for widescreen viewing
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Enhanced Controls:</span> Touch-optimized player controls
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="computer" className="border border-gray-800 rounded-xl p-6 bg-black/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-xl font-bold mb-4">Computer</h3>
                <p className="text-muted-foreground mb-6">
                  Access PhimGG through your web browser on any computer for convenient streaming with advanced features.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Windows PCs (Windows 8.1 or later)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Mac computers (macOS 10.13 or later)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Chrome OS devices</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Linux computers (with supported browsers)</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Button asChild>
                    <a href="/">Go to Web App</a>
                  </Button>
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-8 text-center">
                <Laptop className="h-24 w-24 mx-auto mb-4 text-primary" />
                <h4 className="text-lg font-semibold mb-2">Supported Browsers</h4>
                <ul className="text-sm text-muted-foreground text-left space-y-3">
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Google Chrome:</span> Version 89 or later
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Mozilla Firefox:</span> Version 85 or later
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Safari:</span> Version 14 or later
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Microsoft Edge:</span> Version 89 or later
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Opera:</span> Version 75 or later
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="console" className="border border-gray-800 rounded-xl p-6 bg-black/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-xl font-bold mb-4">Game Consoles</h3>
                <p className="text-muted-foreground mb-6">
                  Turn your gaming console into an entertainment center with PhimGG, available on major gaming platforms.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>PlayStation 4 and PlayStation 5</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Xbox One and Xbox Series X/S</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Nintendo Switch</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Button asChild>
                    <a href="/faqs">Console Setup Guide</a>
                  </Button>
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-8 text-center">
                <Gamepad className="h-24 w-24 mx-auto mb-4 text-primary" />
                <h4 className="text-lg font-semibold mb-2">Installation Steps</h4>
                <ol className="text-sm text-muted-foreground text-left space-y-3">
                  <li className="border-b border-gray-800 pb-3">1. Navigate to your console's store (PlayStation Store, Microsoft Store, etc.)</li>
                  <li className="border-b border-gray-800 pb-3">2. Search for the PhimGG app</li>
                  <li className="border-b border-gray-800 pb-3">3. Download and install the application</li>
                  <li className="border-b border-gray-800 pb-3">4. Launch the app and sign in with your PhimGG account</li>
                  <li>5. Use your controller to navigate the interface</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="streaming" className="border border-gray-800 rounded-xl p-6 bg-black/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-xl font-bold mb-4">Streaming Devices</h3>
                <p className="text-muted-foreground mb-6">
                  Use dedicated streaming devices to enjoy PhimGG on any TV, even if it's not a smart TV.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Amazon Fire TV Stick (all generations)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Roku devices (Roku Express and above)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Apple TV (4th generation and newer)</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Google Chromecast devices</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>NVIDIA Shield TV</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Button asChild>
                    <a href="/devices">Compare Devices</a>
                  </Button>
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-8 text-center">
                <Cast className="h-24 w-24 mx-auto mb-4 text-primary" />
                <h4 className="text-lg font-semibold mb-2">Key Benefits</h4>
                <ul className="text-sm text-muted-foreground text-left space-y-3">
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Portability:</span> Easily move between TVs in your home
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Affordability:</span> Less expensive than upgrading to a new smart TV
                  </li>
                  <li className="border-b border-gray-800 pb-3">
                    <span className="font-medium text-foreground">Performance:</span> Often faster than built-in smart TV apps
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Voice Control:</span> Many devices offer voice search capabilities
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Requirements section */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Technical Requirements</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="bg-black/20 border-gray-800">
            <CardHeader>
              <Wifi className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Internet Requirements</CardTitle>
              <CardDescription>Recommended connection speeds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Standard Definition (SD)</h4>
                <p className="text-sm text-muted-foreground">3 Mbps or higher</p>
              </div>
              <div>
                <h4 className="font-medium">High Definition (HD)</h4>
                <p className="text-sm text-muted-foreground">5 Mbps or higher</p>
              </div>
              <div>
                <h4 className="font-medium">Full HD (1080p)</h4>
                <p className="text-sm text-muted-foreground">10 Mbps or higher</p>
              </div>
              <div>
                <h4 className="font-medium">Ultra HD (4K)</h4>
                <p className="text-sm text-muted-foreground">25 Mbps or higher</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-gray-800">
            <CardHeader>
              <Lightbulb className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Optimal Viewing</CardTitle>
              <CardDescription>Tips for the best experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Streaming Quality</h4>
                <p className="text-sm text-muted-foreground">Adjust in account settings</p>
              </div>
              <div>
                <h4 className="font-medium">Network Connection</h4>
                <p className="text-sm text-muted-foreground">Wired preferred over Wi-Fi</p>
              </div>
              <div>
                <h4 className="font-medium">Data Usage</h4>
                <p className="text-sm text-muted-foreground">~1GB per hour for SD, ~3GB for HD</p>
              </div>
              <div>
                <h4 className="font-medium">Device Updates</h4>
                <p className="text-sm text-muted-foreground">Keep software up to date</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-gray-800">
            <CardHeader>
              <AlertCircle className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Troubleshooting</CardTitle>
              <CardDescription>Common solutions for issues</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Buffering Issues</h4>
                <p className="text-sm text-muted-foreground">Restart device or router</p>
              </div>
              <div>
                <h4 className="font-medium">App Not Loading</h4>
                <p className="text-sm text-muted-foreground">Clear cache and reinstall</p>
              </div>
              <div>
                <h4 className="font-medium">Poor Video Quality</h4>
                <p className="text-sm text-muted-foreground">Check internet connection</p>
              </div>
              <div>
                <h4 className="font-medium">Login Issues</h4>
                <p className="text-sm text-muted-foreground">Reset password or contact support</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Setup guide */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Quick Setup Guide</h2>
        
        <ol className="relative border-l border-gray-700 ml-3 space-y-8">
          <li className="mb-10 ml-8">
            <div className="absolute w-8 h-8 bg-primary/20 rounded-full -left-4 flex items-center justify-center">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold">Create an Account</h3>
            <p className="text-muted-foreground mb-4">
              Sign up for PhimGG by visiting our website or downloading the app. Choose a subscription plan that fits your needs.
            </p>
            <Button asChild variant="outline" size="sm">
              <a href="/auth">Create Account</a>
            </Button>
          </li>
          <li className="mb-10 ml-8">
            <div className="absolute w-8 h-8 bg-primary/20 rounded-full -left-4 flex items-center justify-center">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold">Download the App</h3>
            <p className="text-muted-foreground mb-4">
              Install the PhimGG app on your preferred device from the appropriate app store or marketplace.
            </p>
          </li>
          <li className="mb-10 ml-8">
            <div className="absolute w-8 h-8 bg-primary/20 rounded-full -left-4 flex items-center justify-center">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold">Sign In</h3>
            <p className="text-muted-foreground mb-4">
              Launch the app and sign in using your email and password. You can create up to 5 profiles for different family members.
            </p>
          </li>
          <li className="mb-10 ml-8">
            <div className="absolute w-8 h-8 bg-primary/20 rounded-full -left-4 flex items-center justify-center">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold">Browse and Enjoy</h3>
            <p className="text-muted-foreground mb-4">
              Browse through our extensive library of movies and shows, create your watchlist, and start streaming!
            </p>
            <Button asChild size="sm">
              <a href="/movies">Browse Content</a>
            </Button>
          </li>
        </ol>
      </div>

      {/* Help section */}
      <div className="max-w-3xl mx-auto text-center">
        <Alert className="bg-primary/10 border-primary mb-8">
          <AlertTitle className="flex items-center justify-center">
            <PlayCircle className="h-5 w-5 mr-2" /> 
            Need more help?
          </AlertTitle>
          <AlertDescription>
            Our support team is available 24/7 to assist you with any questions or issues.
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild variant="outline">
            <a href="/faqs">Visit FAQs</a>
          </Button>
          <Button asChild>
            <a href="/contact">Contact Support</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HowToWatchPage;