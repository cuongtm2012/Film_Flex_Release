import React, { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer 
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />
    </div>
  );
}
