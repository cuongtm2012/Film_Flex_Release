import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Film, 
  Trophy, 
  Users, 
  Globe, 
  Tv, 
  Timer, 
  PlayCircle, 
  Lock,
  ChevronRight
} from "lucide-react";

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      {/* Hero section */}
      <div className="mb-16 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">About FilmFlex</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Your premier streaming destination, bringing quality entertainment to audiences worldwide.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/movies" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Browse Movies
          </a>
          <a href="/tv" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2">
            Explore TV Shows
          </a>
        </div>
      </div>

      {/* Our story section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 items-center">
        <div className="order-2 md:order-1">
          <h2 className="text-3xl font-bold mb-4">Our Story</h2>
          <p className="text-muted-foreground mb-4">
            Founded in 2023, FilmFlex began with a simple mission: to create a streaming platform that delivers exceptional content while providing an intuitive user experience.
          </p>
          <p className="text-muted-foreground mb-4">
            What started as a small team of passionate film enthusiasts has grown into a platform serving viewers across multiple countries, offering thousands of titles across every genre imaginable.
          </p>
          <p className="text-muted-foreground">
            Our commitment to quality content, technological innovation, and customer satisfaction has made us one of the fastest-growing streaming services in the market.
          </p>
        </div>
        <div className="bg-black/20 rounded-lg p-8 order-1 md:order-2">
          <div className="space-y-6">
            <div className="flex items-start">
              <Film className="h-8 w-8 text-primary mr-4 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">1,000+ Movies</h3>
                <p className="text-sm text-muted-foreground">
                  A vast library of films from classic favorites to the latest blockbusters
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Tv className="h-8 w-8 text-primary mr-4 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">500+ TV Shows</h3>
                <p className="text-sm text-muted-foreground">
                  Binge-worthy series across every genre
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Users className="h-8 w-8 text-primary mr-4 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">100,000+ Users</h3>
                <p className="text-sm text-muted-foreground">
                  Growing community of satisfied viewers
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Globe className="h-8 w-8 text-primary mr-4 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">25+ Countries</h3>
                <p className="text-sm text-muted-foreground">
                  Serving audiences worldwide with localized content
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission & Values */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Our Mission & Values</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            At FilmFlex, we're guided by core principles that define how we operate and the experience we create for our users.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-black/20 p-6 rounded-lg">
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <PlayCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Quality Content</h3>
            <p className="text-muted-foreground">
              We believe in delivering high-quality, diverse content that entertains, inspires, and reflects the rich tapestry of human experience.
            </p>
          </div>

          <div className="bg-black/20 p-6 rounded-lg">
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">User Privacy</h3>
            <p className="text-muted-foreground">
              We are committed to protecting user data and ensuring transparent policies that respect privacy while delivering personalized experiences.
            </p>
          </div>

          <div className="bg-black/20 p-6 rounded-lg">
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Timer className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Innovation</h3>
            <p className="text-muted-foreground">
              We continuously evolve our platform with cutting-edge technology to provide seamless streaming and discovery features.
            </p>
          </div>
        </div>
      </div>

      {/* Meet the team section - simplified for the demo */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Meet Our Leadership</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            FilmFlex is powered by a diverse team of industry experts passionate about entertainment and technology.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              name: "Alex Johnson",
              role: "Chief Executive Officer",
              bio: "Former entertainment executive with 15+ years experience in media."
            },
            {
              name: "Samantha Lee",
              role: "Chief Content Officer",
              bio: "Award-winning producer focused on diverse storytelling."
            },
            {
              name: "Michael Chen",
              role: "Chief Technology Officer",
              bio: "Tech veteran specializing in streaming architecture."
            },
            {
              name: "Olivia Rodriguez",
              role: "Chief Marketing Officer",
              bio: "Digital marketing strategist with global brand experience."
            }
          ].map((member, index) => (
            <div key={index} className="bg-black/20 p-6 rounded-lg text-center">
              <div className="h-20 w-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{member.name}</h3>
              <p className="text-sm text-primary mb-2">{member.role}</p>
              <p className="text-sm text-muted-foreground">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Awards section */}
      <div className="mb-20 bg-black/20 p-8 rounded-lg">
        <div className="text-center mb-8">
          <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Awards & Recognition</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our commitment to excellence has been recognized across the industry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center p-4 bg-black/30 rounded-lg">
            <div className="mr-4 flex-shrink-0">
              <div className="h-12 w-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Best Streaming Platform 2024</h3>
              <p className="text-sm text-muted-foreground">Digital Entertainment Awards</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-black/30 rounded-lg">
            <div className="mr-4 flex-shrink-0">
              <div className="h-12 w-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Innovation in User Experience</h3>
              <p className="text-sm text-muted-foreground">Tech & Media Summit 2023</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-black/30 rounded-lg">
            <div className="mr-4 flex-shrink-0">
              <div className="h-12 w-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Content Curation Excellence</h3>
              <p className="text-sm text-muted-foreground">Streaming Industry Association</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-black/30 rounded-lg">
            <div className="mr-4 flex-shrink-0">
              <div className="h-12 w-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Best Mobile Streaming Experience</h3>
              <p className="text-sm text-muted-foreground">Mobile App Awards 2023</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center bg-primary/10 p-10 rounded-lg mb-10">
        <h2 className="text-3xl font-bold mb-4">Join the FilmFlex Community</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Start streaming today and discover why millions of viewers choose FilmFlex for their entertainment needs.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/auth" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Sign Up Now
          </a>
          <a href="/faqs" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2">
            Learn More
          </a>
        </div>
      </div>

      {/* Related pages */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-4">More About FilmFlex</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <a href="/faqs" className="p-4 bg-black/20 rounded-lg flex justify-between items-center hover:bg-black/30 transition-colors">
          <span className="font-medium">Frequently Asked Questions</span>
          <ChevronRight className="h-5 w-5" />
        </a>
        <a href="/terms" className="p-4 bg-black/20 rounded-lg flex justify-between items-center hover:bg-black/30 transition-colors">
          <span className="font-medium">Terms of Service</span>
          <ChevronRight className="h-5 w-5" />
        </a>
        <a href="/contact" className="p-4 bg-black/20 rounded-lg flex justify-between items-center hover:bg-black/30 transition-colors">
          <span className="font-medium">Contact Us</span>
          <ChevronRight className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
};

export default AboutPage;