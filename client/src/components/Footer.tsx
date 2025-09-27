import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Film, 
  Tv,
  Calendar,
  Star,
  HelpCircle,
  Monitor,
  FileText,
  Mail,
  Info,
  Briefcase,
  BookOpen,
  FileTerminal,
  Shield,
  Cookie,
  ChevronUp,
  ChevronDown
} from "lucide-react";

// Helper component for footer links
const FooterLink = ({ 
  href, 
  icon, 
  children, 
  isScrollTop = false,
  onScrollTop,
  onCustomClick
}: { 
  href: string, 
  icon: React.ReactNode, 
  children: React.ReactNode,
  isScrollTop?: boolean,
  onScrollTop?: () => void,
  onCustomClick?: () => void
}) => {
  
  if (isScrollTop) {
    return (
      <li>
        <div 
          onClick={onScrollTop}
          className="text-gray-300 hover:text-primary flex items-center cursor-pointer transition-colors duration-200 relative group"
          role="button"
          aria-label="Scroll to top"
        >
          {icon}
          <span>{children}</span>
          
          {/* Tooltip */}
          <div className="absolute -top-8 left-0 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Scroll to top
          </div>
        </div>
      </li>
    );
  }

  if (onCustomClick) {
    return (
      <li>
        <div 
          onClick={onCustomClick}
          className="text-gray-300 hover:text-primary flex items-center cursor-pointer transition-colors duration-200"
          role="button"
          aria-label={`Navigate to ${children}`}
        >
          {icon}
          <span>{children}</span>
        </div>
      </li>
    );
  }
  
  return (
    <li>
      <Link href={href}>
        <div className="text-gray-300 hover:text-primary flex items-center cursor-pointer transition-colors duration-200">
          {icon}
          <span>{children}</span>
        </div>
      </Link>
    </li>
  );
};

// Collapsible footer section for mobile
interface FooterSectionProps {
  title: string;
  children: React.ReactNode;
}

const FooterSection = ({ title, children }: FooterSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-gray-800 md:border-none pb-3 md:pb-0">
      <div 
        className="flex items-center justify-between cursor-pointer md:cursor-default"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold mb-2 md:mb-4">{title}</h3>
        <button className="md:hidden" aria-label={isOpen ? "Collapse section" : "Expand section"}>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      <div className={`${isOpen ? 'block' : 'hidden'} md:block`}>
        {children}
      </div>
    </div>
  );
};

const Footer = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [, setLocation] = useLocation();

  // Function to handle scrolling to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Function to handle Movies link click with smooth scroll-to-top before navigation
  const handleMoviesClick = () => {
    // First scroll to top smoothly
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // Wait for scroll animation to complete before navigating
    // Use a timeout that matches the typical smooth scroll duration
    setTimeout(() => {
      setLocation('/movies');
    }, 600); // 600ms should be enough for smooth scroll to complete
  };

  // Show button when page is scrolled down
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Check initial scroll position
    handleScroll();

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <footer className="bg-black text-white py-12 mt-8 relative">
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="scroll-to-top-btn fixed bottom-20 right-6 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary-dark transition-all duration-300 z-50 animate-fade-in"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}

      <div className="container mx-auto px-4">
        {/* Logo and tagline */}
        <div className="flex flex-col md:flex-row justify-between mb-10">
          <div className="mb-6 md:mb-0">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-primary">PhimGG</span>
              </div>
            </Link>
            <p className="text-gray-400 mt-2">Your ultimate streaming destination</p>
          </div>
        </div>

        {/* Footer navigation sections */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
          {/* Browse section - with fewer links for mobile */}
          <FooterSection title="Browse">
            <ul className="space-y-2 mb-4 md:mb-0">
              <FooterLink 
                href="/movies" 
                icon={<Film className="h-4 w-4 mr-2" />}
                onCustomClick={handleMoviesClick}
              >
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
            </ul>
          </FooterSection>

          {/* Help section - with fewer links for mobile */}
          <FooterSection title="Help">
            <ul className="space-y-2 mb-4 md:mb-0">
              <FooterLink href="/account" icon={<HelpCircle className="h-4 w-4 mr-2" />}>
                Account
              </FooterLink>
              <FooterLink href="/how-to-watch" icon={<Monitor className="h-4 w-4 mr-2" />}>
                How to Watch
              </FooterLink>
              <FooterLink href="/faqs" icon={<FileText className="h-4 w-4 mr-2" />}>
                FAQs
              </FooterLink>
              <FooterLink href="/contact" icon={<Mail className="h-4 w-4 mr-2" />}>
                Contact Us
              </FooterLink>
            </ul>
          </FooterSection>

          {/* About section - with fewer links for mobile */}
          <FooterSection title="About">
            <ul className="space-y-2 mb-4 md:mb-0">
              <FooterLink href="/about" icon={<Info className="h-4 w-4 mr-2" />}>
                About Us
              </FooterLink>
              <FooterLink href="/careers" icon={<Briefcase className="h-4 w-4 mr-2" />}>
                Careers
              </FooterLink>
              <FooterLink href="/blog" icon={<BookOpen className="h-4 w-4 mr-2" />}>
                Blog
              </FooterLink>
            </ul>
          </FooterSection>

          {/* Legal section - with fewer links for mobile */}
          <FooterSection title="Legal">
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
            </ul>
          </FooterSection>
        </div>

        {/* Bottom copyright section - more compact */}
        <div className="border-t border-gray-800 mt-6 pt-4 text-center text-gray-400">
          <div className="flex justify-center mb-3">
            <button 
              onClick={scrollToTop}
              className="flex items-center text-gray-300 hover:text-primary transition-colors duration-200"
              aria-label="Back to top"
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              <span>Back to Top</span>
            </button>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} FilmFlex. All rights reserved.</p>
          <p className="mt-1 text-xs">
            For demonstration purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;