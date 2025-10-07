import React from "react";
import { 
  Briefcase, 
  Globe, 
  Code, 
  TrendingUp, 
  Users, 
  Zap, 
  Heart, 
  LucideIcon,
  Rocket,
  Coffee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface JobListing {
  id: number;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Remote";
  description: string;
  posted: string;
}

interface Value {
  icon: LucideIcon;
  title: string;
  description: string;
}

const CareersPage = () => {
  const companyValues: Value[] = [
    {
      icon: Heart,
      title: "User-First Approach",
      description: "We build every feature with our users' needs and satisfaction as our top priority."
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We're constantly pushing boundaries and exploring new technologies to enhance the streaming experience."
    },
    {
      icon: Users,
      title: "Inclusive Environment",
      description: "We celebrate diversity and foster an inclusive workplace where everyone can thrive."
    },
    {
      icon: TrendingUp,
      title: "Growth Mindset",
      description: "We encourage continuous learning, professional development, and creative problem-solving."
    },
    {
      icon: Globe,
      title: "Global Perspective",
      description: "We think globally, creating content and experiences that resonate with diverse audiences worldwide."
    },
    {
      icon: Rocket,
      title: "Ambitious Goals",
      description: "We set ambitious goals and work collaboratively to achieve excellence in everything we do."
    }
  ];

  const benefits = [
    "Competitive salary and equity packages",
    "Comprehensive health, dental, and vision insurance",
    "Flexible work arrangements (remote, hybrid, or in-office)",
    "Unlimited paid time off",
    "Professional development budget",
    "Wellness programs and gym membership",
    "Parental leave",
    "Regular team events and retreats",
    "State-of-the-art equipment",
    "Catered lunches and snacks",
    "401(k) matching",
    "Annual performance bonuses"
  ];

  const jobListings: JobListing[] = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      department: "Engineering",
      location: "San Francisco, CA (Hybrid)",
      type: "Full-time",
      description: "Join our frontend team to build and enhance our user interfaces using React and modern web technologies.",
      posted: "2 days ago"
    },
    {
      id: 2,
      title: "Backend Engineer",
      department: "Engineering",
      location: "Remote (US)",
      type: "Full-time",
      description: "Develop and maintain our cloud-based streaming infrastructure and APIs.",
      posted: "1 week ago"
    },
    {
      id: 3,
      title: "UX/UI Designer",
      department: "Product",
      location: "New York, NY",
      type: "Full-time",
      description: "Create intuitive, beautiful interfaces that enhance the streaming experience across devices.",
      posted: "3 days ago"
    },
    {
      id: 4,
      title: "Content Acquisition Specialist",
      department: "Content",
      location: "Los Angeles, CA",
      type: "Full-time",
      description: "Source and negotiate licensing for movies and TV shows to expand our content library.",
      posted: "2 weeks ago"
    },
    {
      id: 5,
      title: "Data Scientist",
      department: "Analytics",
      location: "Remote (Global)",
      type: "Full-time",
      description: "Analyze user behavior and streaming patterns to improve our recommendation algorithms.",
      posted: "5 days ago"
    },
    {
      id: 6,
      title: "DevOps Engineer",
      department: "Engineering",
      location: "Seattle, WA (Hybrid)",
      type: "Full-time",
      description: "Manage our cloud infrastructure and deployment pipelines to ensure reliable service.",
      posted: "1 day ago"
    },
    {
      id: 7,
      title: "Marketing Specialist",
      department: "Marketing",
      location: "Chicago, IL",
      type: "Full-time",
      description: "Develop and execute marketing strategies to grow our subscriber base.",
      posted: "1 week ago"
    },
    {
      id: 8,
      title: "Customer Support Representative",
      department: "Customer Success",
      location: "Remote (US)",
      type: "Full-time",
      description: "Provide excellent support to our users and help resolve technical issues.",
      posted: "3 days ago"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header section */}
      <div className="mb-16 text-center">
        <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-3">Join Our Team</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Help us revolutionize the way people discover and enjoy entertainment worldwide.
        </p>
      </div>

      {/* Hero section */}
      <div className="relative mb-20 overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40 z-10"></div>
        <div className="h-96 bg-[url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center"></div>
        <div className="absolute inset-0 flex items-center z-20 px-8 md:px-16">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Work at PhimGG?
            </h2>
            <p className="text-white/90 text-lg mb-6">
              At PhimGG, we're building the future of entertainment. Our team is passionate, innovative, and driven to create exceptional streaming experiences for millions of users worldwide.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white text-primary hover:bg-white/90">
                <a href="#jobs">View Open Positions</a>
              </Button>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white/10">
                <a href="#culture">Our Culture</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Company values section */}
      <div className="mb-20" id="culture">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Our Values</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            These principles guide everything we do and shape our company culture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {companyValues.map((value, index) => {
            const Icon = value.icon;
            return (
              <Card key={index} className="bg-black/20 border-gray-800">
                <CardHeader className="pb-2">
                  <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Life at PhimGG section */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Life at PhimGG</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We work hard to create an environment where everyone can do their best work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">          <div className="rounded-xl overflow-hidden h-64 relative group">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
              alt="Team collaboration"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 flex items-end p-6">
              <h3 className="text-white text-lg font-semibold">Collaborative Workspace</h3>
            </div>
          </div>          <div className="rounded-xl overflow-hidden h-64 relative group">
            <img
              src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
              alt="Team meeting"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 flex items-end p-6">
              <h3 className="text-white text-lg font-semibold">Innovation Sessions</h3>
            </div>
          </div>          <div className="rounded-xl overflow-hidden h-64 relative group">
            <img
              src="https://images.unsplash.com/photo-1525422847952-7f91db09a364?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
              alt="Team event"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 flex items-end p-6">
              <h3 className="text-white text-lg font-semibold">Team Retreats</h3>
            </div>
          </div>          <div className="rounded-xl overflow-hidden h-64 relative group">
            <img
              src="https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
              alt="Office space"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 flex items-end p-6">
              <h3 className="text-white text-lg font-semibold">Modern Facilities</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits section */}
      <div className="mb-20 bg-black/20 rounded-xl p-8">
        <div className="text-center mb-8">
          <Coffee className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-3">Benefits & Perks</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We believe in taking care of our team with competitive compensation and great benefits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-black/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Growth Opportunities</h3>
            <p className="text-muted-foreground mb-4">
              We're committed to helping our employees grow professionally through:
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <div className="h-5 w-5 bg-primary/20 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 mr-3">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                </div>
                <span>Mentorship programs</span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 bg-primary/20 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 mr-3">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                </div>
                <span>Conference attendance</span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 bg-primary/20 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 mr-3">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                </div>
                <span>Learning stipends</span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 bg-primary/20 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 mr-3">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                </div>
                <span>Internal mobility</span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 bg-primary/20 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 mr-3">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                </div>
                <span>Leadership development</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Job listings section */}
      <div className="mb-16" id="jobs">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Open Positions</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join our team and help shape the future of entertainment. We're always looking for talented individuals.
          </p>
        </div>

        <div className="space-y-6">
          {jobListings.map((job) => (
            <div key={job.id} className="bg-black/20 border border-gray-800 rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{job.title}</h3>
                  <p className="text-muted-foreground text-sm">{job.department} • {job.location}</p>
                </div>
                <div className="mt-2 md:mt-0">
                  <Badge variant="outline" className="mr-2">{job.type}</Badge>
                  <Badge variant="secondary">Posted {job.posted}</Badge>
                </div>
              </div>
              <p className="mb-6">{job.description}</p>
              <div className="flex justify-end">
                <Button variant="outline" asChild>
                  <a href={`/careers/job/${job.id}`}>View Details & Apply</a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Internship section */}
      <div className="mb-20 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-4">Internship Program</h2>
            <p className="text-muted-foreground mb-6">
              We offer internships across engineering, design, marketing, and content acquisition teams. Our program provides hands-on experience working on real projects alongside industry professionals.
            </p>
            <div className="space-y-3">
              <div className="flex items-start">
                <Code className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Engineering Internships</h4>
                  <p className="text-sm text-muted-foreground">Front-end, back-end, mobile, and data engineering</p>
                </div>
              </div>
              <div className="flex items-start">
                <Users className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Design Internships</h4>
                  <p className="text-sm text-muted-foreground">UX/UI design and research</p>
                </div>
              </div>
              <div className="flex items-start">
                <TrendingUp className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Business Internships</h4>
                  <p className="text-sm text-muted-foreground">Marketing, analytics, and content acquisition</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button asChild>
                <a href="/careers/internships">View Internship Opportunities</a>
              </Button>
            </div>
          </div>
          <div className="relative">            <div className="rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                alt="Interns collaborating"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-black/80 p-4 rounded-lg">
              <p className="text-sm font-medium">
                "The internship at PhimGG was incredibly valuable. I worked on real projects that made a difference."
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                — Former Engineering Intern, now Full-time Engineer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Application process */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Our Application Process</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg font-bold text-primary">1</span>
            </div>
            <h3 className="font-semibold mb-2">Application</h3>
            <p className="text-sm text-muted-foreground">Submit your resume and complete a short questionnaire</p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg font-bold text-primary">2</span>
            </div>
            <h3 className="font-semibold mb-2">Initial Interview</h3>
            <p className="text-sm text-muted-foreground">Phone or video call with our recruiting team</p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg font-bold text-primary">3</span>
            </div>
            <h3 className="font-semibold mb-2">Technical Assessment</h3>
            <p className="text-sm text-muted-foreground">Role-specific assessment or take-home assignment</p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg font-bold text-primary">4</span>
            </div>
            <h3 className="font-semibold mb-2">Final Interviews</h3>
            <p className="text-sm text-muted-foreground">Meet with team members and hiring manager</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-black/20 p-10 rounded-lg mb-10">
        <h2 className="text-3xl font-bold mb-4">Ready to Join Our Team?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Explore our current openings and become part of a team that's redefining entertainment.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <a href="#jobs">Browse Open Positions</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/contact">Contact Recruiting</a>
          </Button>
        </div>
      </div>

      {/* Contact */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Have questions about working at PhimGG?</p>
        <p>Email us at <a href="mailto:careers@filmflex.example.com" className="text-primary hover:underline">careers@filmflex.example.com</a></p>
      </div>
    </div>
  );
};

export default CareersPage;