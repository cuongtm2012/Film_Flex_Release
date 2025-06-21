import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-gray-800 md:border-none pb-3 md:pb-0">
      <div 
        className="flex items-center justify-between cursor-pointer md:cursor-default"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold mb-2 md:mb-4">{title}</h3>
        <button className="md:hidden" aria-label={isOpen ? t('collapse_section') : t('expand_section')}>
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
  const { t } = useTranslation();
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
          aria-label={t('scroll_to_top')}
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
                <span className="text-2xl font-bold text-primary">FilmFlex</span>
              </div>
            </Link>
            <p className="text-gray-400 mt-2">{t('tagline')}</p>
          </div>
        </div>

        {/* Footer navigation sections */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
          {/* Browse section */}
          <FooterSection title={t('browse')}>
            <ul className="space-y-2 mb-4 md:mb-0">
              <FooterLink 
                href="/movies" 
                icon={<Film className="h-4 w-4 mr-2" />}
                onCustomClick={handleMoviesClick}
              >
                {t('movies')}
              </FooterLink>
              <FooterLink href="/tv" icon={<Tv className="h-4 w-4 mr-2" />}>
                {t('tv_series')}
              </FooterLink>
              <FooterLink href="/new-releases" icon={<Calendar className="h-4 w-4 mr-2" />}>
                {t('new_releases')}
              </FooterLink>
              <FooterLink href="/top-rated" icon={<Star className="h-4 w-4 mr-2" />}>
                {t('top_rated')}
              </FooterLink>
            </ul>
          </FooterSection>

          {/* Help section */}
          <FooterSection title={t('help')}>
            <ul className="space-y-2 mb-4 md:mb-0">
              <FooterLink href="/account" icon={<HelpCircle className="h-4 w-4 mr-2" />}>
                {t('account')}
              </FooterLink>
              <FooterLink href="/how-to-watch" icon={<Monitor className="h-4 w-4 mr-2" />}>
                {t('how_to_watch')}
              </FooterLink>
              <FooterLink href="/faqs" icon={<FileText className="h-4 w-4 mr-2" />}>
                {t('faqs')}
              </FooterLink>
              <FooterLink href="/contact" icon={<Mail className="h-4 w-4 mr-2" />}>
                {t('contact_us')}
              </FooterLink>
            </ul>
          </FooterSection>

          {/* About section */}
          <FooterSection title={t('about')}>
            <ul className="space-y-2 mb-4 md:mb-0">
              <FooterLink href="/about" icon={<Info className="h-4 w-4 mr-2" />}>
                {t('about_us')}
              </FooterLink>
              <FooterLink href="/careers" icon={<Briefcase className="h-4 w-4 mr-2" />}>
                {t('careers')}
              </FooterLink>
              <FooterLink href="/blog" icon={<BookOpen className="h-4 w-4 mr-2" />}>
                {t('blog')}
              </FooterLink>
            </ul>
          </FooterSection>

          {/* Legal section */}
          <FooterSection title={t('legal')}>
            <ul className="space-y-2">
              <FooterLink href="/terms" icon={<FileTerminal className="h-4 w-4 mr-2" />}>
                {t('terms_of_use')}
              </FooterLink>
              <FooterLink href="/privacy" icon={<Shield className="h-4 w-4 mr-2" />}>
                {t('privacy_policy')}
              </FooterLink>
              <FooterLink href="/cookie-policy" icon={<Cookie className="h-4 w-4 mr-2" />}>
                {t('cookie_policy')}
              </FooterLink>
            </ul>
          </FooterSection>
        </div>

        {/* Bottom copyright section */}
        <div className="border-t border-gray-800 mt-6 pt-4 text-center text-gray-400">
          <div className="flex justify-center mb-3">
            <button 
              onClick={scrollToTop}
              className="flex items-center text-gray-300 hover:text-primary transition-colors duration-200"
              aria-label={t('back_to_top')}
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              <span>{t('back_to_top')}</span>
            </button>
          </div>
          <p className="text-sm">{t('copyright', { year: new Date().getFullYear() })}</p>
          <p className="mt-1 text-xs">
            {t('demo_notice')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;