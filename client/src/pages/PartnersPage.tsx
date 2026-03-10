import React from "react";
import { 
  Users, 
  Building2, 
  Handshake, 
  Building, 
  Globe, 
  FilmIcon, 
  Play, 
  Code, 
  Mail 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Partner {
  id: number;
  name: string;
  logo: string;
  description: string;
  type: "content" | "technology" | "distribution";
}

const PartnersPage = () => {
  const partners: Partner[] = [
    {
      id: 1,
      name: "Cinematic Studios",
      logo: "https://images.unsplash.com/photo-1651598835995-e053768e7c4a?auto=format&fit=crop&q=80&w=580&h=580",
      description: "A leading film production company providing exclusive content to PhimGG subscribers.",
      type: "content"
    },
    {
      id: 2,
      name: "Global Media Group",
      logo: "https://images.unsplash.com/photo-1586892477838-2b96e85e0f96?auto=format&fit=crop&q=80&w=580&h=580",
      description: "International media conglomerate with a vast library of movies and TV shows from around the world.",
      type: "content"
    },
    {
      id: 3,
      name: "TechStream Solutions",
      logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&q=80&w=580&h=580",
      description: "Providing cutting-edge video encoding and streaming technology to ensure smooth playback across all devices.",
      type: "technology"
    },
    {
      id: 4,
      name: "CloudBox Storage",
      logo: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&q=80&w=580&h=580",
      description: "Cloud infrastructure partner delivering reliable content delivery network services globally.",
      type: "technology"
    },
    {
      id: 5,
      name: "SmartTV Corp",
      logo: "https://images.unsplash.com/photo-1617791160536-598cf32026fb?auto=format&fit=crop&q=80&w=580&h=580",
      description: "Leading smart TV manufacturer with PhimGG pre-installed on all new devices.",
      type: "distribution"
    },
    {
      id: 6,
      name: "Telecom Partners",
      logo: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=580&h=580",
      description: "Major telecommunications provider offering PhimGG bundled with internet service packages.",
      type: "distribution"
    },
    {
      id: 7,
      name: "Independent Film Collective",
      logo: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=580&h=580",
      description: "Collective of independent filmmakers creating exclusive original content for PhimGG.",
      type: "content"
    },
    {
      id: 8,
      name: "AI Recommend Systems",
      logo: "https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&q=80&w=580&h=580",
      description: "AI technology partner powering our personalized recommendation engine.",
      type: "technology"
    },
    {
      id: 9,
      name: "Mobile Carriers Alliance",
      logo: "https://images.unsplash.com/photo-1570717173024-ec8081c8f8e9?auto=format&fit=crop&q=80&w=580&h=580",
      description: "Group of mobile carriers offering PhimGG as part of premium data plans.",
      type: "distribution"
    }
  ];

  const partnershipTypes = [
    {
      title: "Content Partners",
      icon: <FilmIcon className="h-10 w-10 text-primary" />,
      description: "Studios, production companies, and content owners who provide films and TV shows for our platform.",
      benefits: [
        "Global distribution to millions of viewers",
        "Advanced analytics on content performance",
        "Co-production opportunities for original content",
        "Revenue sharing models",
        "Marketing support across PhimGG channels"
      ]
    },
    {
      title: "Technology Partners",
      icon: <Code className="h-10 w-10 text-primary" />,
      description: "Companies providing technology solutions to enhance the streaming experience on our platform.",
      benefits: [
        "Integration with a leading streaming platform",
        "Exposure to a rapidly growing user base",
        "Collaborative innovation opportunities",
        "Joint marketing initiatives",
        "Early access to new PhimGG features"
      ]
    },
    {
      title: "Distribution Partners",
      icon: <Globe className="h-10 w-10 text-primary" />,
      description: "Hardware manufacturers, telecom companies, and service providers who help deliver PhimGG to consumers.",
      benefits: [
        "Value-added service for your customers",
        "Revenue sharing opportunities",
        "Co-branded marketing campaigns",
        "Exclusive bundling offers",
        "Priority technical support"
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header section */}
      <div className="text-center mb-12">
        <Handshake className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-3">Our Partners</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Collaborating with industry leaders to deliver exceptional entertainment experiences.
        </p>
      </div>

      {/* Hero section */}
      <div className="relative mb-20 overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40 z-10"></div>
        <div className="h-72 sm:h-96 bg-[url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center"></div>
        <div className="absolute inset-0 flex items-center z-20 px-8 md:px-16">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Partner With PhimGG
            </h2>
            <p className="text-white/90 text-lg mb-6">
              Join our network of global partners and help shape the future of entertainment. We collaborate with content creators, technology innovators, and distribution channels.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white text-primary hover:bg-white/90">
                <a href="#become-partner">Become a Partner</a>
              </Button>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white/10">
                <a href="#partner-types">Partnership Types</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Partnership types */}
      <div className="mb-20" id="partner-types">
        <h2 className="text-2xl font-bold mb-8 text-center">Types of Partnerships</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {partnershipTypes.map((type, index) => (
            <Card key={index} className="bg-black/20 border-gray-800">
              <CardHeader className="pb-2">
                <div className="mb-4">
                  {type.icon}
                </div>
                <CardTitle>{type.title}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="font-medium mb-3">Key Benefits:</h4>
                <ul className="space-y-2">
                  {type.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2 text-primary">•</span>
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Partner showcase */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold mb-8 text-center">Our Current Partners</h2>
        
        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="all">All Partners</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="technology">Technology</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map(partner => (
                <Card key={partner.id} className="bg-black/20 border-gray-800 overflow-hidden">
                  <div className="p-6 flex items-center justify-center">
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-full bg-black/50 flex items-center justify-center">
                      <img 
                        src={partner.logo} 
                        alt={partner.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <CardHeader className="pt-0 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{partner.name}</CardTitle>
                      <Badge variant="outline">
                        {partner.type === "content" ? "Content" : 
                         partner.type === "technology" ? "Technology" : "Distribution"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{partner.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.filter(p => p.type === "content").map(partner => (
                <Card key={partner.id} className="bg-black/20 border-gray-800 overflow-hidden">
                  <div className="p-6 flex items-center justify-center">
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-full bg-black/50 flex items-center justify-center">
                      <img 
                        src={partner.logo} 
                        alt={partner.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <CardHeader className="pt-0 pb-2">
                    <CardTitle className="text-xl">{partner.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{partner.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="technology" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.filter(p => p.type === "technology").map(partner => (
                <Card key={partner.id} className="bg-black/20 border-gray-800 overflow-hidden">
                  <div className="p-6 flex items-center justify-center">
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-full bg-black/50 flex items-center justify-center">
                      <img 
                        src={partner.logo} 
                        alt={partner.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <CardHeader className="pt-0 pb-2">
                    <CardTitle className="text-xl">{partner.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{partner.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="distribution" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.filter(p => p.type === "distribution").map(partner => (
                <Card key={partner.id} className="bg-black/20 border-gray-800 overflow-hidden">
                  <div className="p-6 flex items-center justify-center">
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-full bg-black/50 flex items-center justify-center">
                      <img 
                        src={partner.logo} 
                        alt={partner.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <CardHeader className="pt-0 pb-2">
                    <CardTitle className="text-xl">{partner.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{partner.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Success stories */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold mb-8 text-center">Partnership Success Stories</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-black/20 rounded-lg overflow-hidden">
            <div className="relative h-48">
              <img 
                src="https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
                alt="Content Partnership Success"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end">
                <div className="p-4">
                  <Badge className="mb-2">Content Partnership</Badge>
                  <h3 className="text-xl font-semibold text-white">Global Media Group + PhimGG</h3>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-4">
                "Our partnership with PhimGG has allowed us to reach audiences we never could before. Our content is now available in 35 countries, and we've seen a 200% increase in viewership for our catalog."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-600 mr-3"></div>
                <div>
                  <p className="font-medium">Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">VP of Distribution, Global Media Group</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-black/20 rounded-lg overflow-hidden">
            <div className="relative h-48">
              <img 
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
                alt="Technology Partnership Success"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end">
                <div className="p-4">
                  <Badge className="mb-2">Technology Partnership</Badge>
                  <h3 className="text-xl font-semibold text-white">TechStream Solutions + PhimGG</h3>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-4">
                "Integrating our video encoding technology with PhimGG has been a game-changer. We've been able to optimize streaming quality while reducing bandwidth by 40%, creating a win-win for both companies."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-600 mr-3"></div>
                <div>
                  <p className="font-medium">David Chen</p>
                  <p className="text-sm text-muted-foreground">CTO, TechStream Solutions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Become a partner section */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg p-8 mb-16" id="become-partner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-3">Become a PhimGG Partner</h2>
            <p className="text-muted-foreground mb-6">
              We're always looking to expand our network of partners across content, technology, and distribution. Join us in shaping the future of streaming entertainment.
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <Building className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">For Companies</h4>
                  <p className="text-sm text-muted-foreground">
                    If you represent a company interested in partnering with PhimGG, our business development team would love to hear from you.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Building2 className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">For Content Creators</h4>
                  <p className="text-sm text-muted-foreground">
                    Independent filmmakers and production companies can submit content for consideration through our dedicated portal.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button asChild>
                <a href="/contact" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" /> Contact Partnership Team
                </a>
              </Button>
            </div>
          </div>
          <div className="bg-black/30 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Partnership Process</h3>
            <ol className="space-y-4">
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-semibold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Initial Contact</p>
                  <p className="text-sm text-muted-foreground">Reach out through our partner inquiry form</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-semibold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Consultation</p>
                  <p className="text-sm text-muted-foreground">Discussion with our partnership team</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-semibold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Proposal</p>
                  <p className="text-sm text-muted-foreground">Customized partnership proposal</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-semibold text-primary">4</span>
                </div>
                <div>
                  <p className="font-medium">Agreement</p>
                  <p className="text-sm text-muted-foreground">Finalization of partnership terms</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-semibold text-primary">5</span>
                </div>
                <div>
                  <p className="font-medium">Launch</p>
                  <p className="text-sm text-muted-foreground">Implementation and announcement</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* FAQ section */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Partnership FAQs</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/20 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">What are the requirements to become a content partner?</h3>
            <p className="text-muted-foreground">
              Content partners should have high-quality, licensed content with clear rights for digital distribution. We evaluate partnerships based on content quality, audience appeal, and strategic fit.
            </p>
          </div>
          
          <div className="bg-black/20 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">How long does the partnership process take?</h3>
            <p className="text-muted-foreground">
              The timeline varies depending on partnership type and complexity. Typically, from initial contact to launch takes anywhere from 1-3 months.
            </p>
          </div>
          
          <div className="bg-black/20 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Are there any costs associated with becoming a partner?</h3>
            <p className="text-muted-foreground">
              Partnership structures vary based on type and scope. Some involve revenue sharing, while others may require integration costs or minimum commitments. Our team will discuss specifics during consultation.
            </p>
          </div>
          
          <div className="bg-black/20 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">What support does PhimGG provide to partners?</h3>
            <p className="text-muted-foreground">
              We provide technical integration support, marketing opportunities, analytics dashboards, and a dedicated partner manager to ensure success.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Partner With Us?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Take the first step toward a mutually beneficial partnership that can help grow your business and enhance the PhimGG experience.
        </p>
        <Button asChild size="lg">
          <a href="/contact">Get Started</a>
        </Button>
      </div>
    </div>
  );
};

export default PartnersPage;