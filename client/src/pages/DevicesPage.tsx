import React from "react";
import { 
  Tv, 
  Smartphone, 
  Tablet, 
  Laptop, 
  Gamepad, 
  Cast,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DevicesPage = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header section */}
      <div className="text-center mb-12">
        <Cast className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-3">Supported Devices</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          PhimGG is available on a wide range of devices to ensure you can enjoy your favorite content anywhere, anytime.
        </p>
      </div>

      {/* Device icons section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 mb-16">
        {[
          { icon: <Tv size={40} />, name: "Smart TVs" },
          { icon: <Smartphone size={40} />, name: "Smartphones" },
          { icon: <Tablet size={40} />, name: "Tablets" },
          { icon: <Laptop size={40} />, name: "Computers" },
          { icon: <Gamepad size={40} />, name: "Gaming Consoles" },
          { icon: <Cast size={40} />, name: "Streaming Devices" }
        ].map((device, index) => (
          <Card key={index} className="hover:border-primary transition-all cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="mb-3 text-primary">{device.icon}</div>
              <h3 className="font-semibold">{device.name}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Device comparison table */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Device Comparison</h2>
        
        <div className="rounded-xl border border-gray-800 overflow-hidden bg-black/20">
          <Table>
            <TableCaption>Supported features vary by device model and region.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Device Type</TableHead>
                <TableHead>HD (1080p)</TableHead>
                <TableHead>Ultra HD (4K)</TableHead>
                <TableHead>HDR Support</TableHead>
                <TableHead>Offline Viewing</TableHead>
                <TableHead>Voice Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Smart TVs</TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell><XCircle className="h-5 w-5 text-red-500" /></TableCell>
                <TableCell className="text-muted-foreground">Varies by model</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Smartphones</TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell className="text-muted-foreground">Select models</TableCell>
                <TableCell className="text-muted-foreground">Select models</TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Tablets</TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell className="text-muted-foreground">Select models</TableCell>
                <TableCell className="text-muted-foreground">Select models</TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Computers</TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell className="text-muted-foreground">Via browser</TableCell>
                <TableCell><XCircle className="h-5 w-5 text-red-500" /></TableCell>
                <TableCell><XCircle className="h-5 w-5 text-red-500" /></TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Gaming Consoles</TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell><XCircle className="h-5 w-5 text-red-500" /></TableCell>
                <TableCell className="text-muted-foreground">Varies by model</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Streaming Devices</TableCell>
                <TableCell><CheckCircle2 className="h-5 w-5 text-green-500" /></TableCell>
                <TableCell className="text-muted-foreground">Premium models</TableCell>
                <TableCell className="text-muted-foreground">Premium models</TableCell>
                <TableCell><XCircle className="h-5 w-5 text-red-500" /></TableCell>
                <TableCell className="text-muted-foreground">Varies by model</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Specific device lists */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Supported Models by Category</h2>
        
        <Accordion type="single" collapsible className="bg-black/20 rounded-lg border border-gray-800">
          <AccordionItem value="item-1" className="border-b-gray-800">
            <AccordionTrigger className="px-6">
              <div className="flex items-center">
                <Tv className="mr-3 h-5 w-5 text-primary" /> Smart TVs
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Samsung</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Samsung Smart TVs (2018 or newer)</li>
                    <li>• Samsung Tizen OS 4.0 or higher</li>
                    <li>• Samsung The Frame, QLED, and Crystal UHD models</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">LG</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• LG WebOS 4.0 or higher (2018 or newer)</li>
                    <li>• LG OLED, NanoCell, and UHD models</li>
                    <li>• LG Smart TVs with LG Content Store access</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Sony</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Sony Android TV models (2016 or newer)</li>
                    <li>• Sony Google TV models</li>
                    <li>• Sony Bravia models with app store access</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Other Brands</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Hisense (VIDAA OS 3.0 or higher)</li>
                    <li>• TCL (Roku OS or Android TV)</li>
                    <li>• Philips (Android TV or Saphi OS)</li>
                    <li>• Vizio SmartCast TVs (2018 or newer)</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-b-gray-800">
            <AccordionTrigger className="px-6">
              <div className="flex items-center">
                <Smartphone className="mr-3 h-5 w-5 text-primary" /> Smartphones
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Apple iOS</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• iPhone running iOS 13.0 or later</li>
                    <li>• iPhone 6s or newer models</li>
                    <li>• Full support for iPhone 11 and newer (HDR capabilities)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Android</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Android phones running Android 7.0 (Nougat) or higher</li>
                    <li>• Samsung Galaxy S8 or newer</li>
                    <li>• Google Pixel series</li>
                    <li>• OnePlus 5 or newer</li>
                    <li>• Most major Android manufacturers supported</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 bg-black/30 p-3 rounded-md">
                <h4 className="font-semibold flex items-center mb-2">
                  <Info className="h-4 w-4 mr-2 text-blue-400" />
                  HDR Support Note
                </h4>
                <p className="text-sm text-muted-foreground">
                  HDR10 and Dolby Vision support is available on select high-end Android and iOS devices. Requires compatible hardware and software.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-b-gray-800">
            <AccordionTrigger className="px-6">
              <div className="flex items-center">
                <Tablet className="mr-3 h-5 w-5 text-primary" /> Tablets
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Apple iPads</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• iPad running iOS 13.0 or later</li>
                    <li>• iPad (5th generation or newer)</li>
                    <li>• iPad Air (2nd generation or newer)</li>
                    <li>• iPad Pro (all models)</li>
                    <li>• iPad Mini (4th generation or newer)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Android Tablets</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Android tablets running Android 7.0 or higher</li>
                    <li>• Samsung Galaxy Tab S3 or newer</li>
                    <li>• Google Pixel tablets</li>
                    <li>• Lenovo tablets (selected models)</li>
                    <li>• Huawei MediaPad/MatePad (selected models)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Amazon Fire</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Fire tablets with Fire OS 5 or later</li>
                    <li>• Fire HD 8 (2018 or newer)</li>
                    <li>• Fire HD 10 (2017 or newer)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Windows Tablets</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Windows 10/11 tablets</li>
                    <li>• Microsoft Surface Pro 3 or newer</li>
                    <li>• Microsoft Surface Go</li>
                    <li>• Other Windows tablets with browser support</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border-b-gray-800">
            <AccordionTrigger className="px-6">
              <div className="flex items-center">
                <Laptop className="mr-3 h-5 w-5 text-primary" /> Computers
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Supported Operating Systems</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Windows 8.1 or later</li>
                    <li>• macOS 10.13 (High Sierra) or later</li>
                    <li>• Chrome OS (all current versions)</li>
                    <li>• Linux (major distributions with supported browsers)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Supported Web Browsers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Google Chrome (version 89+)</li>
                      <li>• Mozilla Firefox (version 85+)</li>
                      <li>• Safari (version 14+)</li>
                    </ul>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Microsoft Edge (version 89+)</li>
                      <li>• Opera (version 75+)</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-black/30 p-4 rounded-md">
                  <h4 className="font-semibold mb-2">Hardware Requirements for HD and 4K Streaming</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start">
                      <Badge className="mt-0.5 mr-2" variant="outline">HD (1080p)</Badge>
                      <p className="text-muted-foreground">Intel Core i3 (2nd gen or newer) or AMD equivalent, 4GB RAM, and dedicated GPU for smoother playback</p>
                    </div>
                    <div className="flex items-start">
                      <Badge className="mt-0.5 mr-2" variant="outline">4K</Badge>
                      <p className="text-muted-foreground">Intel Core i7 or AMD equivalent, 16GB RAM, dedicated GPU, 4K display, and HDCP 2.2 support</p>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border-b-gray-800">
            <AccordionTrigger className="px-6">
              <div className="flex items-center">
                <Gamepad className="mr-3 h-5 w-5 text-primary" /> Gaming Consoles
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">PlayStation</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• PlayStation 5 (All models)</li>
                    <li>• PlayStation 4 (All models)</li>
                    <li>• PlayStation 4 Pro (Enhanced Performance)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Xbox</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Xbox Series X (4K HDR Support)</li>
                    <li>• Xbox Series S</li>
                    <li>• Xbox One</li>
                    <li>• Xbox One S</li>
                    <li>• Xbox One X (Enhanced Performance)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Nintendo</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Nintendo Switch</li>
                    <li>• Nintendo Switch Lite</li>
                    <li>• Nintendo Switch OLED</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground bg-black/30 p-3 rounded-md">
                <p>Note: Some older console models may have limited feature support. Resolution capabilities depend on console specifications.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6">
            <AccordionTrigger className="px-6">
              <div className="flex items-center">
                <Cast className="mr-3 h-5 w-5 text-primary" /> Streaming Devices
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Amazon Fire TV</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Fire TV Stick (all generations)</li>
                    <li>• Fire TV Stick 4K</li>
                    <li>• Fire TV Stick 4K Max</li>
                    <li>• Fire TV Cube</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Roku</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Roku Express and Express+</li>
                    <li>• Roku Streaming Stick and Streaming Stick+</li>
                    <li>• Roku Ultra</li>
                    <li>• Roku Streambar</li>
                    <li>• Roku TV models</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Apple TV</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Apple TV HD (4th generation)</li>
                    <li>• Apple TV 4K (1st and 2nd generation)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Google / Android TV</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Chromecast (3rd generation)</li>
                    <li>• Chromecast with Google TV</li>
                    <li>• NVIDIA Shield TV and Shield TV Pro</li>
                    <li>• Xiaomi Mi Box S</li>
                    <li>• Other Android TV boxes (Android 7.0+)</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Recommended devices */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Our Recommended Devices</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-black/20 border-gray-800 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-4">
              <Badge variant="secondary" className="mb-2">Best Value</Badge>
              <h3 className="text-xl font-bold">Roku Streaming Stick+</h3>
              <p className="text-sm text-muted-foreground">Affordable 4K HDR streaming</p>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Resolution</span>
                  <span className="text-sm font-medium">4K with HDR</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Voice Control</span>
                  <span className="text-sm font-medium">Yes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Setup Difficulty</span>
                  <span className="text-sm font-medium">Easy</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Price Range</span>
                  <span className="text-sm font-medium">$49.99</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6" asChild>
                <a href="https://www.roku.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                  Learn More <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-primary border-2 overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1">
              TOP PICK
            </div>
            <div className="bg-gradient-to-r from-primary/30 to-primary/20 p-4">
              <Badge variant="secondary" className="mb-2">Premium Experience</Badge>
              <h3 className="text-xl font-bold">NVIDIA Shield TV Pro</h3>
              <p className="text-sm text-muted-foreground">Ultimate streaming and gaming</p>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Resolution</span>
                  <span className="text-sm font-medium">4K with Dolby Vision & HDR10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Voice Control</span>
                  <span className="text-sm font-medium">Yes (Google Assistant)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Setup Difficulty</span>
                  <span className="text-sm font-medium">Medium</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Price Range</span>
                  <span className="text-sm font-medium">$199.99</span>
                </div>
              </div>
              <Button className="w-full mt-6" asChild>
                <a href="https://www.nvidia.com/shield" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                  Learn More <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-gray-800 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-4">
              <Badge variant="secondary" className="mb-2">User-Friendly</Badge>
              <h3 className="text-xl font-bold">Apple TV 4K</h3>
              <p className="text-sm text-muted-foreground">Sleek interface and ecosystem</p>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Resolution</span>
                  <span className="text-sm font-medium">4K with Dolby Vision</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Voice Control</span>
                  <span className="text-sm font-medium">Yes (Siri)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Setup Difficulty</span>
                  <span className="text-sm font-medium">Easy</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Price Range</span>
                  <span className="text-sm font-medium">$179.99</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6" asChild>
                <a href="https://www.apple.com/apple-tv-4k" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                  Learn More <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Help and support */}
      <div className="max-w-3xl mx-auto text-center bg-black/20 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Need Help Setting Up Your Device?</h2>
        <p className="text-muted-foreground mb-6">
          Our support team is ready to assist with any device-specific questions or troubleshooting issues.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild variant="outline">
            <a href="/how-to-watch">Setup Guides</a>
          </Button>
          <Button asChild>
            <a href="/contact">Contact Support</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DevicesPage;