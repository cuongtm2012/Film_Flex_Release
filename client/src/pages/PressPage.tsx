import React from "react";
import { 
  Newspaper, 
  Download, 
  Mail, 
  ExternalLink, 
  TrendingUp, 
  Users, 
  Award, 
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PressRelease {
  id: number;
  title: string;
  date: string;
  summary: string;
  category: "Company" | "Product" | "Content" | "Awards";
  featured?: boolean;
}

interface MediaMention {
  id: number;
  outlet: string;
  title: string;
  date: string;
  url: string;
  logo: string;
}

const PressPage = () => {
  const pressReleases: PressRelease[] = [
    {
      id: 1,
      title: "FilmFlex Announces International Expansion to 10 New Countries",
      date: "April 15, 2025",
      summary: "FilmFlex is expanding its streaming service to 10 new countries across Europe and Asia, bringing its unique content library and personalized viewing experience to millions of new viewers worldwide.",
      category: "Company",
      featured: true
    },
    {
      id: 2,
      title: "FilmFlex Introduces Enhanced 4K Streaming with Dolby Atmos Support",
      date: "March 22, 2025",
      summary: "Today FilmFlex rolled out enhanced 4K streaming capabilities with Dolby Atmos support, offering viewers unparalleled visual and audio quality for select content across compatible devices.",
      category: "Product",
      featured: true
    },
    {
      id: 3,
      title: "FilmFlex Secures Exclusive Streaming Rights to Award-Winning Film Festival Selections",
      date: "February 10, 2025",
      summary: "FilmFlex has acquired exclusive streaming rights to this year's top film festival selections, including winners from Sundance, Berlin, and SXSW, reinforcing its commitment to bringing diverse, critically-acclaimed content to subscribers.",
      category: "Content"
    },
    {
      id: 4,
      title: "FilmFlex Named 'Streaming Service of the Year' at Digital Entertainment Awards",
      date: "January 28, 2025",
      summary: "FilmFlex has been recognized as 'Streaming Service of the Year' at the 2025 Digital Entertainment Awards, praised for its innovative features, content curation, and user experience design.",
      category: "Awards"
    },
    {
      id: 5,
      title: "FilmFlex Partners with Leading Studios for Original Content Development",
      date: "December 12, 2024",
      summary: "FilmFlex announces strategic partnerships with five major studios to develop exclusive original content, with plans to release over 20 new original series and films in the coming year.",
      category: "Content"
    },
    {
      id: 6,
      title: "FilmFlex Launches New Mobile App with Enhanced Offline Viewing Experience",
      date: "November 5, 2024",
      summary: "FilmFlex has released a completely redesigned mobile application featuring enhanced offline viewing capabilities, improved navigation, and personalized content recommendations powered by AI.",
      category: "Product"
    },
    {
      id: 7,
      title: "FilmFlex Reports 40% Growth in Subscriber Base for Q3 2024",
      date: "October 20, 2024",
      summary: "FilmFlex today announced a 40% year-over-year increase in its global subscriber base for Q3 2024, driven by content acquisitions, product innovations, and expanded market reach.",
      category: "Company"
    },
    {
      id: 8,
      title: "FilmFlex's Interactive Movie Experience 'Choose Your Adventure' Wins Innovation Prize",
      date: "September 15, 2024",
      summary: "FilmFlex's groundbreaking interactive movie experience 'Choose Your Adventure' has won the prestigious Innovation in Entertainment Technology Award for its revolutionary approach to viewer engagement.",
      category: "Awards"
    }
  ];

  const mediaMentions: MediaMention[] = [
    {
      id: 1,
      outlet: "TechCrunch",
      title: "How FilmFlex is Redefining the Streaming Experience with AI-Powered Recommendations",
      date: "April 5, 2025",
      url: "#",
      logo: "https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png?w=32"
    },
    {
      id: 2,
      outlet: "Variety",
      title: "FilmFlex's International Expansion Strategy Pays Off with Record Growth",
      date: "March 30, 2025",
      url: "#",
      logo: "https://variety.com/wp-content/uploads/2023/09/favicon.png?w=32"
    },
    {
      id: 3,
      outlet: "The Hollywood Reporter",
      title: "FilmFlex Emerges as Major Player in Streaming Wars with Studio Partnerships",
      date: "March 15, 2025",
      url: "#",
      logo: "https://www.hollywoodreporter.com/wp-content/uploads/2022/10/cropped-thr-site-icon-1-32x32.png?w=32"
    },
    {
      id: 4,
      outlet: "WIRED",
      title: "The Technology Behind FilmFlex's Seamless 4K Streaming Experience",
      date: "February 22, 2025",
      url: "#",
      logo: "https://www.wired.com/favicon.ico"
    },
    {
      id: 5,
      outlet: "Forbes",
      title: "FilmFlex CEO Discusses the Future of Entertainment in Digital Age",
      date: "February 10, 2025",
      url: "#",
      logo: "https://i.forbesimg.com/media/assets/appicons/forbes-app-icon_57x57.png"
    },
    {
      id: 6,
      outlet: "Deadline",
      title: "FilmFlex's Original Content Strategy Attracts Top Industry Talent",
      date: "January 28, 2025",
      url: "#",
      logo: "https://deadline.com/wp-content/uploads/2021/03/cropped-deadline-favicon-2021.png?w=32"
    }
  ];

  const companyFacts = [
    { title: "Founded", value: "2023" },
    { title: "Global HQ", value: "San Francisco, CA" },
    { title: "Regional Offices", value: "New York, London, Tokyo, Singapore" },
    { title: "Employees", value: "500+" },
    { title: "Countries Served", value: "35+" },
    { title: "Content Library", value: "10,000+ titles" },
    { title: "Monthly Active Users", value: "4.5M+" },
    { title: "Funding", value: "Series C" }
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header section */}
      <div className="text-center mb-12">
        <Newspaper className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-3">Press & Media</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Latest news, press releases, and media resources for FilmFlex.
        </p>
      </div>

      {/* Press contacts section */}
      <div className="bg-black/20 p-6 rounded-lg mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-bold mb-3">Press Contact</h2>
            <p className="text-muted-foreground mb-4">
              For press inquiries, interview requests, or additional information, please contact our media relations team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex items-center">
                <a href="mailto:press@filmflex.example.com">
                  <Mail className="mr-2 h-4 w-4" /> Email Press Team
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="#press-kit">
                  <Download className="mr-2 h-4 w-4" /> Download Press Kit
                </a>
              </Button>
            </div>
          </div>
          <div className="bg-black/30 p-4 rounded-md">
            <h3 className="font-semibold mb-3">Media Relations Team</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Email:</span> press@filmflex.example.com</p>
              <p><span className="text-muted-foreground">Phone:</span> +1 (555) 123-4567</p>
              <p><span className="text-muted-foreground">Hours:</span> 9:00 AM - 6:00 PM EST, Mon-Fri</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured press releases */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8">Featured Announcements</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pressReleases
            .filter(release => release.featured)
            .map(release => (
              <Card key={release.id} className="bg-black/20 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge variant="outline">{release.category}</Badge>
                    <span className="text-sm text-muted-foreground">{release.date}</span>
                  </div>
                  <CardTitle className="text-xl mt-2">{release.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{release.summary}</p>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/press/releases/${release.id}`}>Read Full Release</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* All press releases */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8">Press Releases</h2>
        
        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="awards">Awards</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {pressReleases.map(release => (
              <div key={release.id} className="p-5 border border-gray-800 rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                  <h3 className="font-semibold">{release.title}</h3>
                  <div className="flex items-center gap-3 mt-2 md:mt-0">
                    <Badge variant="outline">{release.category}</Badge>
                    <span className="text-sm text-muted-foreground">{release.date}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{release.summary}</p>
                <Button asChild variant="outline" size="sm">
                  <a href={`/press/releases/${release.id}`}>Read More</a>
                </Button>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="company" className="space-y-4">
            {pressReleases.filter(release => release.category === "Company").map(release => (
              <div key={release.id} className="p-5 border border-gray-800 rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                  <h3 className="font-semibold">{release.title}</h3>
                  <span className="text-sm text-muted-foreground mt-2 md:mt-0">{release.date}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{release.summary}</p>
                <Button asChild variant="outline" size="sm">
                  <a href={`/press/releases/${release.id}`}>Read More</a>
                </Button>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="product" className="space-y-4">
            {pressReleases.filter(release => release.category === "Product").map(release => (
              <div key={release.id} className="p-5 border border-gray-800 rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                  <h3 className="font-semibold">{release.title}</h3>
                  <span className="text-sm text-muted-foreground mt-2 md:mt-0">{release.date}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{release.summary}</p>
                <Button asChild variant="outline" size="sm">
                  <a href={`/press/releases/${release.id}`}>Read More</a>
                </Button>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4">
            {pressReleases.filter(release => release.category === "Content").map(release => (
              <div key={release.id} className="p-5 border border-gray-800 rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                  <h3 className="font-semibold">{release.title}</h3>
                  <span className="text-sm text-muted-foreground mt-2 md:mt-0">{release.date}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{release.summary}</p>
                <Button asChild variant="outline" size="sm">
                  <a href={`/press/releases/${release.id}`}>Read More</a>
                </Button>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="awards" className="space-y-4">
            {pressReleases.filter(release => release.category === "Awards").map(release => (
              <div key={release.id} className="p-5 border border-gray-800 rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                  <h3 className="font-semibold">{release.title}</h3>
                  <span className="text-sm text-muted-foreground mt-2 md:mt-0">{release.date}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{release.summary}</p>
                <Button asChild variant="outline" size="sm">
                  <a href={`/press/releases/${release.id}`}>Read More</a>
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Media coverage */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8">FilmFlex in the News</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaMentions.map(mention => (
            <Card key={mention.id} className="bg-black/20 border-gray-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <img 
                      src={mention.logo} 
                      alt={mention.outlet} 
                      className="h-6 w-6 mr-2"
                    />
                    <span className="font-medium">{mention.outlet}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{mention.date}</span>
                </div>
                <CardTitle className="text-base">{mention.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="text-primary p-0 h-auto" asChild>
                  <a href={mention.url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                    Read Article <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Company fact sheet */}
      <div className="mb-16" id="fact-sheet">
        <h2 className="text-2xl font-bold mb-8">Company Fact Sheet</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="space-y-5">
              {companyFacts.map((fact, index) => (
                <div key={index} className="flex justify-between pb-2 border-b border-gray-800">
                  <span className="text-muted-foreground">{fact.title}</span>
                  <span className="font-medium">{fact.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                Company Growth
              </h3>
              <p className="text-muted-foreground text-sm">
                FilmFlex has experienced 200% year-over-year growth since its launch in 2023, expanding from 5 to 35 countries and growing its content library from 2,000 to over 10,000 titles.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Leadership
              </h3>
              <p className="text-muted-foreground text-sm">
                FilmFlex was founded by a team of technology and entertainment industry veterans with previous experience at Netflix, Disney, and major tech companies.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <Award className="mr-2 h-5 w-5 text-primary" />
                Recognition
              </h3>
              <p className="text-muted-foreground text-sm">
                FilmFlex has been recognized with multiple industry awards for its innovative technology, user experience design, and content curation.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                Important Dates
              </h3>
              <p className="text-muted-foreground text-sm">
                Founded: January 2023<br />
                Series A Funding: June 2023<br />
                Series B Funding: March 2024<br />
                Series C Funding: November 2024
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Press kit section */}
      <div className="mb-16 bg-black/20 rounded-lg p-8" id="press-kit">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-3">Press Kit</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Download official FilmFlex assets for media use, including logos, product images, executive headshots, and more.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-black/30 border-gray-800">
            <CardHeader>
              <CardTitle>Logo Package</CardTitle>
              <CardDescription>FilmFlex logos in various formats</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full" size="sm">
                <a href="#" className="flex items-center justify-center">
                  <Download className="mr-2 h-4 w-4" /> Download (12MB)
                </a>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-black/30 border-gray-800">
            <CardHeader>
              <CardTitle>Product Screenshots</CardTitle>
              <CardDescription>High-resolution UI images</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full" size="sm">
                <a href="#" className="flex items-center justify-center">
                  <Download className="mr-2 h-4 w-4" /> Download (25MB)
                </a>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-black/30 border-gray-800">
            <CardHeader>
              <CardTitle>Executive Photos</CardTitle>
              <CardDescription>Headshots of leadership team</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full" size="sm">
                <a href="#" className="flex items-center justify-center">
                  <Download className="mr-2 h-4 w-4" /> Download (18MB)
                </a>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-black/30 border-gray-800">
            <CardHeader>
              <CardTitle>Complete Press Kit</CardTitle>
              <CardDescription>All assets and brand guidelines</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="sm">
                <a href="#" className="flex items-center justify-center">
                  <Download className="mr-2 h-4 w-4" /> Download (60MB)
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 p-4 bg-black/40 rounded-md text-sm text-muted-foreground">
          <p>
            All assets are provided for press and media use only. By downloading, you agree to use these materials in accordance with FilmFlex's usage guidelines and to provide appropriate attribution when necessary.
          </p>
        </div>
      </div>

      {/* Event calendar */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8">Upcoming Events</h2>
        
        <div className="space-y-4">
          <div className="p-5 border border-gray-800 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 flex md:block">
              <div className="bg-primary/10 rounded-lg p-3 text-center w-20 md:w-auto mr-4 md:mr-0">
                <span className="block text-xs text-muted-foreground">MAY</span>
                <span className="block text-2xl font-bold">15</span>
                <span className="block text-xs text-muted-foreground">2025</span>
              </div>
            </div>
            <div className="md:col-span-3">
              <h3 className="text-lg font-semibold">FilmFlex Developer Conference</h3>
              <p className="text-sm text-muted-foreground mb-3">
                San Francisco, CA • 9:00 AM - 5:00 PM PST
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Join us for our annual developer conference where we'll unveil new APIs, tools, and platform features for developers building on the FilmFlex ecosystem.
              </p>
              <div className="flex space-x-3">
                <Button asChild variant="outline" size="sm">
                  <a href="#">Learn More</a>
                </Button>
                <Button asChild size="sm">
                  <a href="#">Media Registration</a>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-5 border border-gray-800 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 flex md:block">
              <div className="bg-primary/10 rounded-lg p-3 text-center w-20 md:w-auto mr-4 md:mr-0">
                <span className="block text-xs text-muted-foreground">JUN</span>
                <span className="block text-2xl font-bold">08</span>
                <span className="block text-xs text-muted-foreground">2025</span>
              </div>
            </div>
            <div className="md:col-span-3">
              <h3 className="text-lg font-semibold">FilmFlex Summer Showcase</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Virtual Event • 10:00 AM PST
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                A virtual event showcasing FilmFlex's summer content lineup, featuring exclusive trailers, creator interviews, and announcements of new original productions.
              </p>
              <div className="flex space-x-3">
                <Button asChild variant="outline" size="sm">
                  <a href="#">Learn More</a>
                </Button>
                <Button asChild size="sm">
                  <a href="#">Media Registration</a>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-5 border border-gray-800 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 flex md:block">
              <div className="bg-primary/10 rounded-lg p-3 text-center w-20 md:w-auto mr-4 md:mr-0">
                <span className="block text-xs text-muted-foreground">JUL</span>
                <span className="block text-2xl font-bold">22</span>
                <span className="block text-xs text-muted-foreground">2025</span>
              </div>
            </div>
            <div className="md:col-span-3">
              <h3 className="text-lg font-semibold">Entertainment Technology Summit</h3>
              <p className="text-sm text-muted-foreground mb-3">
                London, UK • 9:00 AM - 4:00 PM BST
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                FilmFlex's CTO will be delivering a keynote address on the future of streaming technology and AI-driven content discovery at this industry-leading summit.
              </p>
              <div className="flex space-x-3">
                <Button asChild variant="outline" size="sm">
                  <a href="#">Learn More</a>
                </Button>
                <Button asChild size="sm">
                  <a href="#">Media Registration</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media contact CTA */}
      <div className="text-center bg-black/20 p-8 rounded-lg mb-10">
        <h2 className="text-2xl font-bold mb-4">Media Inquiries</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          For interview requests, additional information, or to be added to our press distribution list, please contact our media relations team.
        </p>
        <Button asChild size="lg">
          <a href="mailto:press@filmflex.example.com" className="flex items-center">
            <Mail className="mr-2 h-5 w-5" /> Contact Press Team
          </a>
        </Button>
      </div>
    </div>
  );
};

export default PressPage;