/**
 * FilmFlex Watch History Test Suite
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WatchHistoryPage from '../client/src/pages/WatchHistoryPage';

// Mock the auth hook
jest.mock('../client/src/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 1, email: 'test@example.com' }
  }))
}));

// Mock the toast hook
jest.mock('../client/src/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn()
  }))
}));

// Mock wouter
const mockNavigate = jest.fn();
jest.mock('wouter', () => ({
  useLocation: () => ['/watch-history', mockNavigate]
}));

describe('WatchHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  // TC_WH_001: Verify watch history items are displayed correctly
  test('TC_WH_001: Verify watch history items are displayed correctly', async () => {
    // Mock the API request for watch history
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 1,
          movieSlug: 'movie-1',
          progress: 65,
          lastWatchedAt: '2025-04-01T14:30:00Z',
          createdAt: '2025-04-01T14:30:00Z',
          movie: {
            id: 1,
            title: 'Movie 1',
            slug: 'movie-1',
            poster: '/path/to/thumbnail1.jpg',
            type: 'movie'
          }
        },
        {
          id: 2,
          movieSlug: 'movie-2',
          progress: 30,
          lastWatchedAt: '2025-04-02T18:45:00Z',
          createdAt: '2025-04-02T18:45:00Z',
          movie: {
            id: 2,
            title: 'Movie 2',
            slug: 'movie-2',
            poster: '/path/to/thumbnail2.jpg',
            type: 'movie'
          }
        }
      ])
    });
    
    render(<WatchHistoryPage />);
    
    // Verify watch history items are displayed
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
    
    // Verify progress bars are displayed
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2);
    
    // Verify API was called with correct user ID
    expect(global.fetch).toHaveBeenCalledWith('/api/users/1/view-history');
  });
  
  // TC_WH_002: Verify progress bar reflects correct watch progress
  test('TC_WH_002: Verify progress bar reflects correct watch progress', async () => {
    // Mock the API request for watch history
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 1,
          movieSlug: 'movie-1',
          progress: 65,
          lastWatchedAt: '2025-04-01T14:30:00Z',
          createdAt: '2025-04-01T14:30:00Z',
          movie: {
            id: 1,
            title: 'Movie 1',
            slug: 'movie-1',
            poster: '/path/to/thumbnail1.jpg',
            type: 'movie'
          }
        }
      ])
    });
    
    render(<WatchHistoryPage />);
    
    // Verify progress bar value matches the expected progress
    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
    });
  });

  // TC_WH_003: Verify "Continue Watching" button works
  test('TC_WH_003: Verify "Continue Watching" button works', async () => {
    // Mock the API request for watch history
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 1,
          movieSlug: 'movie-1',
          progress: 65,
          lastWatchedAt: '2025-04-01T14:30:00Z',
          createdAt: '2025-04-01T14:30:00Z',
          movie: {
            id: 1,
            title: 'Movie 1',
            slug: 'movie-1',
            poster: '/path/to/thumbnail1.jpg',
            type: 'movie'
          }
        }
      ])
    });
    
    render(<WatchHistoryPage />);
    
    // Find and click the "Continue" button
    await waitFor(() => {
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);
    });
    
    // Verify navigation to the movie page with time parameter
    // 65% of 120 minutes (default duration) = 78 minutes = 4680 seconds
    expect(mockNavigate).toHaveBeenCalledWith('/movie/movie-1?t=4680');
  });

  // TC_WH_004: Verify deleting an item removes it from watch history
  test('TC_WH_004: Verify deleting an item removes it from watch history', async () => {
    // Mock API request to get initial watch history
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 1,
          movieSlug: 'movie-1',
          progress: 65,
          lastWatchedAt: '2025-04-01T14:30:00Z',
          createdAt: '2025-04-01T14:30:00Z',
          movie: {
            id: 1,
            title: 'Movie 1',
            slug: 'movie-1',
            poster: '/path/to/thumbnail1.jpg',
            type: 'movie'
          }
        },
        {
          id: 2,
          movieSlug: 'movie-2',
          progress: 30,
          lastWatchedAt: '2025-04-02T18:45:00Z',
          createdAt: '2025-04-02T18:45:00Z',
          movie: {
            id: 2,
            title: 'Movie 2',
            slug: 'movie-2',
            poster: '/path/to/thumbnail2.jpg',
            type: 'movie'
          }
        }
      ])
    });
    
    render(<WatchHistoryPage />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
    
    // Find and click the delete button for the first item
    const deleteButtons = screen.getAllByRole('button', { name: /trash/i });
    fireEvent.click(deleteButtons[0]);
    
    // Verify the item is removed from the UI (local state update)
    await waitFor(() => {
      expect(screen.queryByText('Movie 1')).not.toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
  });

  // TC_WH_005: Verify loading state is displayed while fetching data
  test('TC_WH_005: Verify loading state is displayed while fetching data', async () => {
    // Mock a delayed API response
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve([])
        }), 100)
      )
    );
    
    render(<WatchHistoryPage />);
    
    // Verify loading skeletons are displayed
    expect(screen.getAllByTestId('skeleton')).toHaveLength(6); // 3 groups * 2 items each
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  // TC_WH_006: Verify empty state when no watch history exists
  test('TC_WH_006: Verify empty state when no watch history exists', async () => {
    // Mock empty API response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    });
    
    render(<WatchHistoryPage />);
    
    // Verify empty state is displayed
    await waitFor(() => {
      expect(screen.getByText('No watch history yet')).toBeInTheDocument();
      expect(screen.getByText('Your watch history will appear here once you start watching movies and shows')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /discover content/i })).toBeInTheDocument();
    });
  });

  // TC_WH_007: Verify error handling when API fails
  test('TC_WH_007: Verify error handling when API fails', async () => {
    // Mock failed API response
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('API Error'));
    
    const mockToast = jest.fn();
    require('../client/src/hooks/use-toast').useToast.mockReturnValue({
      toast: mockToast
    });
    
    render(<WatchHistoryPage />);
    
    // Verify error toast is shown
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to load watch history",
        variant: "destructive"
      });
    });
  });

  // TC_WH_008: Verify search functionality filters results correctly
  test('TC_WH_008: Verify search functionality filters results correctly', async () => {
    // Mock API response with multiple items
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 1,
          movieSlug: 'stranger-things',
          progress: 75,
          lastWatchedAt: '2025-04-01T14:30:00Z',
          createdAt: '2025-04-01T14:30:00Z',
          movie: {
            id: 1,
            title: 'Stranger Things',
            slug: 'stranger-things',
            poster: '/path/to/poster1.jpg',
            type: 'series'
          }
        },
        {
          id: 2,
          movieSlug: 'dune',
          progress: 100,
          lastWatchedAt: '2025-04-02T18:45:00Z',
          createdAt: '2025-04-02T18:45:00Z',
          movie: {
            id: 2,
            title: 'Dune',
            slug: 'dune',
            poster: '/path/to/poster2.jpg',
            type: 'movie'
          }
        }
      ])
    });
    
    render(<WatchHistoryPage />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Stranger Things')).toBeInTheDocument();
      expect(screen.getByText('Dune')).toBeInTheDocument();
    });
    
    // Search for "Stranger"
    const searchInput = screen.getByPlaceholderText('Search watch history...');
    fireEvent.change(searchInput, { target: { value: 'Stranger' } });
    
    // Verify filtered results
    expect(screen.getByText('Stranger Things')).toBeInTheDocument();
    expect(screen.queryByText('Dune')).not.toBeInTheDocument();
  });
});