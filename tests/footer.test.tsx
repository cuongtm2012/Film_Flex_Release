/**
 * FilmFlex Footer Test Suite
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Footer } from '../client/src/components/Footer';

describe('Footer', () => {
  // Mock navigation for link testing
  const mockNavigate = jest.fn();
  jest.mock('wouter', () => ({
    useLocation: () => ['/'],
    useNavigate: () => mockNavigate
  }));

  // TC_FOOTER_001: Verify footer is displayed on all pages
  test('TC_FOOTER_001: Verify footer is displayed on all pages', async () => {
    // Mock various page components with Footer
    const HomePage = () => (
      <div>
        <div>Home Page Content</div>
        <Footer />
      </div>
    );
    
    const ProfilePage = () => (
      <div>
        <div>Profile Page Content</div>
        <Footer />
      </div>
    );
    
    const WatchHistoryPage = () => (
      <div>
        <div>Watch History Page Content</div>
        <Footer />
      </div>
    );
    
    const MyListPage = () => (
      <div>
        <div>My List Page Content</div>
        <Footer />
      </div>
    );
    
    // Render each page and verify footer is present
    const { unmount } = render(<HomePage />);
    expect(screen.getByText(/about us/i)).toBeInTheDocument();
    expect(screen.getByText(/contact/i)).toBeInTheDocument();
    expect(screen.getByText(/terms/i)).toBeInTheDocument();
    unmount();
    
    render(<ProfilePage />);
    expect(screen.getByText(/about us/i)).toBeInTheDocument();
    expect(screen.getByText(/contact/i)).toBeInTheDocument();
    expect(screen.getByText(/terms/i)).toBeInTheDocument();
    unmount();
    
    render(<WatchHistoryPage />);
    expect(screen.getByText(/about us/i)).toBeInTheDocument();
    expect(screen.getByText(/contact/i)).toBeInTheDocument();
    expect(screen.getByText(/terms/i)).toBeInTheDocument();
    unmount();
    
    render(<MyListPage />);
    expect(screen.getByText(/about us/i)).toBeInTheDocument();
    expect(screen.getByText(/contact/i)).toBeInTheDocument();
    expect(screen.getByText(/terms/i)).toBeInTheDocument();
  });
  
  // TC_FOOTER_002: Verify footer links navigate correctly
  test('TC_FOOTER_002: Verify footer links navigate correctly', async () => {
    render(<Footer />);
    
    // Test navigation for various footer links
    const aboutLink = screen.getByRole('link', { name: /about us/i });
    fireEvent.click(aboutLink);
    expect(mockNavigate).toHaveBeenCalledWith('/about');
    
    const contactLink = screen.getByRole('link', { name: /contact/i });
    fireEvent.click(contactLink);
    expect(mockNavigate).toHaveBeenCalledWith('/contact');
    
    const termsLink = screen.getByRole('link', { name: /terms/i });
    fireEvent.click(termsLink);
    expect(mockNavigate).toHaveBeenCalledWith('/terms');
    
    const faqsLink = screen.getByRole('link', { name: /faqs/i });
    fireEvent.click(faqsLink);
    expect(mockNavigate).toHaveBeenCalledWith('/faqs');
  });

  // TC_FOOTER_003: Verify footer responsiveness on different devices
  test('TC_FOOTER_003: Verify footer responsiveness on different devices', async () => {
    // Set up tests for various screen sizes
    const testResponsiveness = (width) => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      // Render footer with current screen width
      const { container } = render(<Footer />);
      
      // Check responsive layout
      const footerElement = container.firstChild;
      
      // Use getComputedStyle to check responsive styling
      const computedStyle = window.getComputedStyle(footerElement);
      
      // For desktop (width > 1024px), footer should have 4 columns in a row
      if (width > 1024) {
        expect(computedStyle.display).toBe('flex');
        expect(computedStyle.flexDirection).toBe('row');
      }
      // For tablet (width 768-1024px), footer should still have columns but with different widths
      else if (width >= 768) {
        expect(computedStyle.display).toBe('flex');
        expect(computedStyle.flexDirection).toBe('row');
        expect(computedStyle.flexWrap).toBe('wrap');
      }
      // For mobile (width < 768px), footer should stack vertically
      else {
        expect(computedStyle.display).toBe('flex');
        expect(computedStyle.flexDirection).toBe('column');
      }
    };
    
    // Test desktop layout
    testResponsiveness(1200);
    
    // Test tablet layout
    testResponsiveness(800);
    
    // Test mobile layout
    testResponsiveness(480);
  });
});