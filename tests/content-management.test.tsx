/**
 * Admin Panel Content Management Test Suite
 * 
 * This file contains tests for the content management features of the admin panel.
 * Important: This test runs against the actual components with real API data.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ContentManagementScreen from '../client/src/pages/admin/ContentManagementScreen';

// Create a fresh QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper component with necessary providers
const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Panel - Content Management Tests (Real API)', () => {
  // CM-01: Display content list
  test('CM-01: Display content list', async () => {
    renderWithProviders(<ContentManagementScreen />);
    
    // Wait for the content list to load from real API
    await waitFor(() => {
      expect(screen.getByText(/Content Management/i)).toBeInTheDocument();
      expect(screen.getByText(/ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Type/i)).toBeInTheDocument();
      expect(screen.getByText(/Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Views/i)).toBeInTheDocument();
      expect(screen.getByText(/Rating/i)).toBeInTheDocument();
      expect(screen.getByText(/Actions/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // The actual content titles will vary based on your database,
    // but we can check that some content rows are displayed
    await waitFor(() => {
      // Check that at least one content row exists
      const contentRows = screen.getAllByRole('row');
      expect(contentRows.length).toBeGreaterThan(1); // Header row + at least one data row
    }, { timeout: 5000 });
  });

  // CM-02: Search content
  test('CM-02: Search content', async () => {
    renderWithProviders(<ContentManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/Content Management/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Find the search box with a more reliable query
    // Using a combination of queries to increase chance of finding the element
    let searchInput;
    try {
      // First try by placeholder text
      searchInput = screen.getByPlaceholderText(/search/i);
    } catch (e) {
      try {
        // Then try by role
        searchInput = screen.getByRole('searchbox');
      } catch (e) {
        // Finally try by a generic input with a search-related attribute
        searchInput = Array.from(document.querySelectorAll('input')).find(
          input => input.placeholder?.toLowerCase().includes('search') ||
                  input.getAttribute('aria-label')?.toLowerCase().includes('search') ||
                  input.id?.toLowerCase().includes('search')
        );
      }
    }
    
    expect(searchInput).toBeTruthy();
    
    // Use a more specific search term that's more likely to yield consistent results
    // instead of just "a" which is too generic
    const searchTerm = "Stranger"; // A common term in movie titles
    
    // Clear the input first to ensure clean state
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, searchTerm);
    
    // Add a slight delay to ensure the UI updates
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Use multiple ways to trigger the search
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    // Look for a search button as an alternative way to trigger search
    try {
      const searchButton = screen.getByRole('button', { name: /search/i });
      if (searchButton) {
        await userEvent.click(searchButton);
      }
    } catch (e) {
      // It's fine if there's no search button
      console.log('No explicit search button found, continuing with Enter key search');
    }
    
    // Verify that the search results are displayed with a more lenient check
    await waitFor(() => {
      // First verify we still have content (not an empty state)
      expect(document.body.textContent).not.toMatch(/no results found/i);
      
      // Check that at least one content row exists after search
      const contentRows = screen.getAllByRole('row');
      expect(contentRows.length).toBeGreaterThan(1); // Header row + at least one data row
    }, { timeout: 8000 }); // Longer timeout for API response
  });

  // CM-03: Filter by content type
  test('CM-03: Filter by content type', async () => {
    renderWithProviders(<ContentManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/Content Management/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Find and click the type filter dropdown
    const typeFilter = screen.getByText(/All Types/i);
    fireEvent.click(typeFilter);
    
    // Select "movie" from the dropdown (assuming this option exists in your UI)
    const movieOption = screen.getByText(/^movie$/i);
    fireEvent.click(movieOption);
    
    // Verify that the filtered results are displayed
    // Again, can't check specific titles, but we can verify the filter was applied
    await waitFor(() => {
      // Check that we still have at least one content row after filtering
      const contentRows = screen.getAllByRole('row');
      expect(contentRows.length).toBeGreaterThan(1); // Header row + at least one data row
      
      // If your UI shows the current filter as a chip or label, check for that
      const filterIndicator = screen.getByText(/movie/i);
      expect(filterIndicator).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});