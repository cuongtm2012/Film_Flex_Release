import React from "react";
import { Link } from "wouter";
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube 
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-8 bg-black mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="mb-6 md:mb-0">
            <Link to="/" className="text-primary font-bold text-2xl">
              FilmFlex
            </Link>
            <p className="text-muted-foreground text-sm mt-2">
              Discover and stream thousands of movies and TV shows.
            </p>
          </div>

          <div className="flex gap-6">
            <a href="#" className="text-white hover:text-primary transition">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="text-white hover:text-primary transition">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-white hover:text-primary transition">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-white hover:text-primary transition">
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="text-white font-bold mb-4">Browse</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/search?type=movie" className="hover:text-white transition">
                  Movies
                </Link>
              </li>
              <li>
                <Link to="/search?type=tv" className="hover:text-white transition">
                  TV Shows
                </Link>
              </li>
              <li>
                <Link to="/search?sort=new" className="hover:text-white transition">
                  New Releases
                </Link>
              </li>
              <li>
                <Link to="/search?sort=popularity" className="hover:text-white transition">
                  Top Rated
                </Link>
              </li>
              <li>
                <Link to="/genres" className="hover:text-white transition">
                  Genres
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Help</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#" className="hover:text-white transition">
                  Account
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  How to Watch
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Devices
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">About</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#" className="hover:text-white transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Press
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Partners
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#" className="hover:text-white transition">
                  Terms of Use
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Content Guidelines
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  DMCA
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 pt-6 text-center text-muted-foreground text-sm">
          <p>
            © {new Date().getFullYear()} FilmFlex. All rights reserved. FilmFlex is not affiliated with any movie studio or streaming service.
          </p>
          <p className="mt-2">Movie data provided by phimapi.com API.</p>
        </div>
      </div>
    </footer>
  );
}
