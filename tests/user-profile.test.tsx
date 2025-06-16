/**
 * FilmFlex User Profile Test Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '../client/src/pages/ProfilePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock the auth hook
jest.mock('../client/src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      createdAt: '2024-01-01T00:00:00Z'
    },
    logoutMutation: {
      mutateAsync: jest.fn(),
    },
  }),
}));

// Mock wouter
jest.mock('wouter', () => ({
  useLocation: () => ['/profile', jest.fn()],
}));

// Mock toast hook
jest.mock('../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const renderWithQueryClient = (component: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('User Profile', () => {
  // TC_UP_001: Verify User Profile page loads successfully
  test('TC_UP_001: Verify User Profile page loads successfully', async () => {
    // Mock the authentication context
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      profileImage: '/path/to/profile.jpg'
    };
    
    // Mock API request for user profile data
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser })
    });
    
    renderWithQueryClient(<ProfilePage />);
    
    // Verify user profile information is displayed
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
    
    // Verify profile tabs are visible
    expect(screen.getByRole('tab', { name: /recent activity/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /watchlist/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /watch history/i })).toBeInTheDocument();
  });
  
  // TC_UP_002: Verify Recent Activity tab shows recent user actions
  test('TC_UP_002: Verify Recent Activity tab shows recent user actions', async () => {
    // Mock API requests
    global.fetch = jest.fn()
      // First request for user profile
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com'
          }
        })
      })
      // Second request for recent activity
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          activities: [
            {
              id: 1,
              type: 'watch',
              title: 'Watched "Movie 1"',
              timestamp: '2025-04-01T14:30:00Z'
            },
            {
              id: 2,
              type: 'list_add',
              title: 'Added "Movie 2" to My List',
              timestamp: '2025-04-02T18:45:00Z'
            }
          ]
        })
      });
    
    renderWithQueryClient(<ProfilePage />);
    
    // Click on the Recent Activity tab
    const recentActivityTab = screen.getByRole('tab', { name: /recent activity/i });
    fireEvent.click(recentActivityTab);
    
    // Verify recent activities are displayed
    await waitFor(() => {
      expect(screen.getByText(/watched "movie 1"/i)).toBeInTheDocument();
      expect(screen.getByText(/added "movie 2" to my list/i)).toBeInTheDocument();
    });
  });

  // TC_UP_003: Verify Watchlist tab shows saved items
  test('TC_UP_003: Verify Watchlist tab shows saved items', async () => {
    // Mock API requests
    global.fetch = jest.fn()
      // First request for user profile
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com'
          }
        })
      })
      // Second request for watchlist
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 1,
              title: 'Movie 1',
              thumbnail: '/path/to/thumbnail1.jpg',
              addedAt: '2025-04-01T14:30:00Z'
            },
            {
              id: 2,
              title: 'Movie 2',
              thumbnail: '/path/to/thumbnail2.jpg',
              addedAt: '2025-04-02T18:45:00Z'
            }
          ]
        })
      });
    
    renderWithQueryClient(<ProfilePage />);
    
    // Click on the Watchlist tab
    const watchlistTab = screen.getByRole('tab', { name: /watchlist/i });
    fireEvent.click(watchlistTab);
    
    // Verify watchlist items are displayed
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
  });

  // TC_UP_004: Verify Watch History tab shows user's watch history
  test('TC_UP_004: Verify Watch History tab shows user\'s watch history', async () => {
    // Mock API requests
    global.fetch = jest.fn()
      // First request for user profile
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com'
          }
        })
      })
      // Second request for watch history
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 1,
              title: 'Movie 1',
              thumbnail: '/path/to/thumbnail1.jpg',
              progress: 65,
              lastWatchedAt: '2025-04-01T14:30:00Z'
            },
            {
              id: 2,
              title: 'Movie 2',
              thumbnail: '/path/to/thumbnail2.jpg',
              progress: 30,
              lastWatchedAt: '2025-04-02T18:45:00Z'
            }
          ]
        })
      });
    
    renderWithQueryClient(<ProfilePage />);
    
    // Click on the Watch History tab
    const watchHistoryTab = screen.getByRole('tab', { name: /watch history/i });
    fireEvent.click(watchHistoryTab);
    
    // Verify watch history items are displayed
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
    
    // Verify progress bars are displayed
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2);
  });

  // TC_UP_005: Verify switching between tabs updates content
  test('TC_UP_005: Verify switching between tabs updates content without page reload', async () => {
    // Mock API requests for all tabs
    global.fetch = jest.fn()
      // First request for user profile
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com'
          }
        })
      })
      // Second request for recent activity
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          activities: [
            {
              id: 1,
              type: 'watch',
              title: 'Watched "Movie 1"',
              timestamp: '2025-04-01T14:30:00Z'
            }
          ]
        })
      })
      // Third request for watchlist
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 1,
              title: 'Movie 1',
              thumbnail: '/path/to/thumbnail1.jpg',
              addedAt: '2025-04-01T14:30:00Z'
            }
          ]
        })
      })
      // Fourth request for watch history
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 2,
              title: 'Movie 2',
              thumbnail: '/path/to/thumbnail2.jpg',
              progress: 30,
              lastWatchedAt: '2025-04-02T18:45:00Z'
            }
          ]
        })
      });
    
    // Mock window object to check if page reloads
    const originalLocation = window.location;
    delete window.location;
    window.location = {
      ...originalLocation,
      reload: jest.fn()
    };
    
    renderWithQueryClient(<ProfilePage />);
    
    // Click on the Recent Activity tab and verify content
    const recentActivityTab = screen.getByRole('tab', { name: /recent activity/i });
    fireEvent.click(recentActivityTab);
    
    await waitFor(() => {
      expect(screen.getByText(/watched "movie 1"/i)).toBeInTheDocument();
    });
    
    // Click on the Watchlist tab and verify content
    const watchlistTab = screen.getByRole('tab', { name: /watchlist/i });
    fireEvent.click(watchlistTab);
    
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
    });
    
    // Click on the Watch History tab and verify content
    const watchHistoryTab = screen.getByRole('tab', { name: /watch history/i });
    fireEvent.click(watchHistoryTab);
    
    await waitFor(() => {
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
    
    // Verify page was not reloaded
    expect(window.location.reload).not.toHaveBeenCalled();
    
    // Restore window.location
    window.location = originalLocation;
  });
});