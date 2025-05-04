import React from "react";
import { Link } from "wouter";
import { 
  Film, 
  Tv,
  Calendar,
  Star,
  List,
  HelpCircle,
  Monitor,
  FileText,
  Mail,
  Info,
  Briefcase,
  Newspaper,
  BookOpen,
  Users,
  FileTerminal,
  Shield,
  Cookie,
  CheckSquare,
  ShieldAlert
} from "lucide-react";

// Helper component for footer links
const FooterLink = ({ href, icon, children }: { href: string, icon: React.ReactNode, children: React.ReactNode }) => (
  <li>
    <Link href={href}>
      <div className="text-gray-300 hover:text-primary flex items-center cursor-pointer transition-colors duration-200">
        {icon}
        <span>{children}</span>
      </div>
    </Link>
  </li>
);

const Footer = () => {
  return (
    <footer className="bg-black text-white py-12 mt-8">
      <div className="container mx-auto px-4">
        {/* Logo and tagline */}
        <div className="flex flex-col md:flex-row justify-between mb-10">
          <div className="mb-6 md:mb-0">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-primary">FilmFlex</span>
              </div>
            </Link>
            <p className="text-gray-400 mt-2">Your ultimate streaming destination</p>
          </div>
        </div>

        {/* Footer navigation sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Browse section */}
          <div>
            <h3 className="text-lg font-bold mb-4">Browse</h3>
            <ul className="space-y-2">
              <FooterLink href="/movies" icon={<Film className="h-4 w-4 mr-2" />}>
                Movies
              </FooterLink>
              <FooterLink href="/tv" icon={<Tv className="h-4 w-4 mr-2" />}>
                TV Shows
              </FooterLink>
              <FooterLink href="/new-releases" icon={<Calendar className="h-4 w-4 mr-2" />}>
                New Releases
              </FooterLink>
              <FooterLink href="/top-rated" icon={<Star className="h-4 w-4 mr-2" />}>
                Top Rated
              </FooterLink>
              <FooterLink href="/genres" icon={<List className="h-4 w-4 mr-2" />}>
                Genres
              </FooterLink>
            </ul>
          </div>

          {/* Help section */}
          <div>
            <h3 className="text-lg font-bold mb-4">Help</h3>
            <ul className="space-y-2">
              <FooterLink href="/account" icon={<HelpCircle className="h-4 w-4 mr-2" />}>
                Account
              </FooterLink>
              <FooterLink href="/how-to-watch" icon={<Monitor className="h-4 w-4 mr-2" />}>
                How to Watch
              </FooterLink>
              <FooterLink href="/devices" icon={<Monitor className="h-4 w-4 mr-2" />}>
                Devices
              </FooterLink>
              <FooterLink href="/faqs" icon={<FileText className="h-4 w-4 mr-2" />}>
                FAQs
              </FooterLink>
              <FooterLink href="/contact" icon={<Mail className="h-4 w-4 mr-2" />}>
                Contact Us
              </FooterLink>
            </ul>
          </div>

          {/* About section */}
          <div>
            <h3 className="text-lg font-bold mb-4">About</h3>
            <ul className="space-y-2">
              <FooterLink href="/about" icon={<Info className="h-4 w-4 mr-2" />}>
                About Us
              </FooterLink>
              <FooterLink href="/careers" icon={<Briefcase className="h-4 w-4 mr-2" />}>
                Careers
              </FooterLink>
              <FooterLink href="/press" icon={<Newspaper className="h-4 w-4 mr-2" />}>
                Press
              </FooterLink>
              <FooterLink href="/blog" icon={<BookOpen className="h-4 w-4 mr-2" />}>
                Blog
              </FooterLink>
              <FooterLink href="/partners" icon={<Users className="h-4 w-4 mr-2" />}>
                Partners
              </FooterLink>
            </ul>
          </div>

          {/* Legal section */}
          <div>
            <h3 className="text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <FooterLink href="/terms" icon={<FileTerminal className="h-4 w-4 mr-2" />}>
                Terms of Use
              </FooterLink>
              <FooterLink href="/privacy" icon={<Shield className="h-4 w-4 mr-2" />}>
                Privacy Policy
              </FooterLink>
              <FooterLink href="/cookie-policy" icon={<Cookie className="h-4 w-4 mr-2" />}>
                Cookie Policy
              </FooterLink>
              <FooterLink href="/content-guidelines" icon={<CheckSquare className="h-4 w-4 mr-2" />}>
                Content Guidelines
              </FooterLink>
              <FooterLink href="/dmca" icon={<ShieldAlert className="h-4 w-4 mr-2" />}>
                DMCA
              </FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom copyright section */}
        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-400">
          <p>© {new Date().getFullYear()} FilmFlex. All rights reserved.</p>
          <p className="mt-2 text-xs">
            FilmFlex is a fictional streaming service created for demonstration purposes. Any resemblance to real services is coincidental.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;