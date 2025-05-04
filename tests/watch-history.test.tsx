/**
 * FilmFlex Watch History Test Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WatchHistoryPage } from '../client/src/pages/WatchHistoryPage';

describe('Watch History', () => {
  // TC_WH_001: Verify watch history list is displayed correctly
  test('TC_WH_001: Verify watch history list is displayed correctly', async () => {
    // Mock the API request for watch history
    global.fetch = jest.fn().mockResolvedValueOnce({
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
    
    render(<WatchHistoryPage />);
    
    // Verify watch history items are displayed
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
    
    // Verify progress bars are displayed
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2);
  });
  
  // TC_WH_002: Verify progress bar reflects correct watch progress
  test('TC_WH_002: Verify progress bar reflects correct watch progress', async () => {
    // Mock the API request for watch history
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        items: [
          {
            id: 1,
            title: 'Movie 1',
            thumbnail: '/path/to/thumbnail1.jpg',
            progress: 65,
            lastWatchedAt: '2025-04-01T14:30:00Z'
          }
        ]
      })
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
    // Mock navigation and API requests
    const mockNavigate = jest.fn();
    jest.mock('wouter', () => ({
      useLocation: () => ['/watch-history'],
      useNavigate: () => mockNavigate
    }));
    
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        items: [
          {
            id: 1,
            slug: 'movie-1',
            title: 'Movie 1',
            thumbnail: '/path/to/thumbnail1.jpg',
            progress: 65,
            lastWatchedAt: '2025-04-01T14:30:00Z',
            currentTime: 3600 // seconds
          }
        ]
      })
    });
    
    render(<WatchHistoryPage />);
    
    // Find and click the "Continue" button
    await waitFor(() => {
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);
    });
    
    // Verify navigation to the movie page with time parameter
    expect(mockNavigate).toHaveBeenCalledWith('/movie/movie-1?t=3600');
  });

  // TC_WH_004: Verify deleting an item removes it from watch history
  test('TC_WH_004: Verify deleting an item removes it from watch history', async () => {
    // Mock API requests
    global.fetch = jest.fn()
      // First request to get watch history
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
      })
      // Second request to delete the item
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      // Third request to get updated watch history
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
    
    render(<WatchHistoryPage />);
    
    // Verify both movies are initially displayed
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
    
    // Find and click the delete button for Movie 1
    const deleteButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(deleteButtons[0]);
    
    // Confirm the deletion in the dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Verify Movie 1 is removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Movie 1')).not.toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
  });

  // TC_WH_005: Verify empty watch history shows appropriate message
  test('TC_WH_005: Verify empty watch history shows appropriate message', async () => {
    // Mock API request for empty watch history
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] })
    });
    
    render(<WatchHistoryPage />);
    
    // Verify empty state message is displayed
    await waitFor(() => {
      expect(screen.getByText(/no watch history found/i)).toBeInTheDocument();
    });
  });
});