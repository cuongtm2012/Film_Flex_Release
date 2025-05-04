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
    
    // Find and interact with the search box
    const searchInput = screen.getByPlaceholderText(/Search content/i);
    
    // Use a search term that's likely to match some content in your database
    await userEvent.type(searchInput, 'a'); // Just searching for the letter 'a' should match something
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    // Verify that the search results are displayed
    // We can't check specific titles since they'll vary, but we can verify the search triggered
    await waitFor(() => {
      // Check that at least one content row exists after search
      const contentRows = screen.getAllByRole('row');
      expect(contentRows.length).toBeGreaterThan(1); // Header row + at least one data row
    }, { timeout: 5000 });
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