/**
 * Admin Panel Content Management Test Suite
 * 
 * This file contains tests for the content management features of the admin panel.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ContentManagementScreen from '../client/src/pages/admin/ContentManagementScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API responses
global.fetch = jest.fn();

const mockContent = [
  { id: 1, title: 'Stranger Things', type: 'tv', status: 'published', views: 12500, rating: 4.8 },
  { id: 2, title: 'The Shawshank Redemption', type: 'movie', status: 'published', views: 9800, rating: 4.9 },
  { id: 3, title: 'Breaking Bad', type: 'tv', status: 'published', views: 15200, rating: 4.7 },
  { id: 4, title: 'Inception', type: 'movie', status: 'published', views: 8700, rating: 4.6 },
  { id: 5, title: 'Upcoming Movie', type: 'movie', status: 'draft', views: 0, rating: 0 }
];

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

// Mock authentication context
jest.mock('../client/src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'admin', email: 'admin@filmflex.com', role: 'admin' },
    isLoading: false,
    loginMutation: { mutate: jest.fn(), isPending: false },
    logoutMutation: { mutate: jest.fn(), isPending: false }
  })
}));

describe('Admin Panel - Content Management Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock fetch for content list
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/admin/content')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            data: mockContent,
            total: mockContent.length,
            page: 1,
            limit: 10
          })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  // CM-01: Display content list
  test('CM-01: Display content list', async () => {
    renderWithProviders(<ContentManagementScreen />);
    
    // Wait for the content list to load
    await waitFor(() => {
      expect(screen.getByText(/Content Management/i)).toBeInTheDocument();
      expect(screen.getByText(/ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Type/i)).toBeInTheDocument();
      expect(screen.getByText(/Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Views/i)).toBeInTheDocument();
      expect(screen.getByText(/Rating/i)).toBeInTheDocument();
      expect(screen.getByText(/Actions/i)).toBeInTheDocument();
    });
    
    // Check that the mock content is displayed
    await waitFor(() => {
      expect(screen.getByText('Stranger Things')).toBeInTheDocument();
      expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    });
  });

  // CM-02: Search content
  test('CM-02: Search content', async () => {
    // Mock search API response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/api/admin/content') && url.includes('search=stranger')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            data: [mockContent[0]], // Only return Stranger Things
            total: 1,
            page: 1,
            limit: 10
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockContent,
          total: mockContent.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<ContentManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/Content Management/i)).toBeInTheDocument();
    });
    
    // Find and interact with the search box
    const searchInput = screen.getByPlaceholderText(/Search content/i);
    await userEvent.type(searchInput, 'stranger');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    // Verify filtered results
    await waitFor(() => {
      expect(screen.getByText('Stranger Things')).toBeInTheDocument();
      expect(screen.queryByText('The Shawshank Redemption')).not.toBeInTheDocument();
    });
  });

  // CM-03: Filter by content type
  test('CM-03: Filter by content type', async () => {
    // Mock type filter API response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/api/admin/content') && url.includes('type=movie')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            data: mockContent.filter(item => item.type === 'movie'),
            total: 3, // 3 movies
            page: 1,
            limit: 10
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockContent,
          total: mockContent.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<ContentManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/Content Management/i)).toBeInTheDocument();
    });
    
    // Find and click the type filter dropdown
    const typeFilter = screen.getByText(/All Types/i);
    fireEvent.click(typeFilter);
    
    // Select "movie" from the dropdown
    const movieOption = screen.getByText(/^movie$/i);
    fireEvent.click(movieOption);
    
    // Verify filtered results - should only see movies
    await waitFor(() => {
      expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
      expect(screen.getByText('Inception')).toBeInTheDocument();
      expect(screen.queryByText('Stranger Things')).not.toBeInTheDocument();
      expect(screen.queryByText('Breaking Bad')).not.toBeInTheDocument();
    });
  });
});