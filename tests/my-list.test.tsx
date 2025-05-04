/**
 * FilmFlex My List Management Test Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyListPage } from '../client/src/pages/MyListPage';

describe('My List Management', () => {
  // TC_ML_001: Verify "My List" displays all added items
  test('TC_ML_001: Verify "My List" displays all added items', async () => {
    // Mock the API request for my list
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        items: [
          {
            id: 1,
            title: 'Movie 1',
            thumbnail: '/path/to/thumbnail1.jpg',
            watched: true,
            addedAt: '2025-04-01T14:30:00Z'
          },
          {
            id: 2,
            title: 'Movie 2',
            thumbnail: '/path/to/thumbnail2.jpg',
            watched: false,
            addedAt: '2025-04-02T18:45:00Z'
          }
        ]
      })
    });
    
    render(<MyListPage />);
    
    // Verify my list items are displayed
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
  });
  
  // TC_ML_002: Verify filtering "Watched" items
  test('TC_ML_002: Verify filtering "Watched" items', async () => {
    // Mock the API request for my list
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        items: [
          {
            id: 1,
            title: 'Movie 1',
            thumbnail: '/path/to/thumbnail1.jpg',
            watched: true,
            addedAt: '2025-04-01T14:30:00Z'
          },
          {
            id: 2,
            title: 'Movie 2',
            thumbnail: '/path/to/thumbnail2.jpg',
            watched: false,
            addedAt: '2025-04-02T18:45:00Z'
          }
        ]
      })
    });
    
    render(<MyListPage />);
    
    // Wait for the initial list to load
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
    });
    
    // Select the "Watched" filter
    const watchedFilter = screen.getByRole('radio', { name: /watched/i });
    fireEvent.click(watchedFilter);
    
    // Verify only watched items are displayed
    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.queryByText('Movie 2')).not.toBeInTheDocument();
  });

  // TC_ML_003: Verify filtering "Unwatched" items
  test('TC_ML_003: Verify filtering "Unwatched" items', async () => {
    // Mock the API request for my list
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        items: [
          {
            id: 1,
            title: 'Movie 1',
            thumbnail: '/path/to/thumbnail1.jpg',
            watched: true,
            addedAt: '2025-04-01T14:30:00Z'
          },
          {
            id: 2,
            title: 'Movie 2',
            thumbnail: '/path/to/thumbnail2.jpg',
            watched: false,
            addedAt: '2025-04-02T18:45:00Z'
          }
        ]
      })
    });
    
    render(<MyListPage />);
    
    // Wait for the initial list to load
    await waitFor(() => {
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
    
    // Select the "Unwatched" filter
    const unwatchedFilter = screen.getByRole('radio', { name: /unwatched/i });
    fireEvent.click(unwatchedFilter);
    
    // Verify only unwatched items are displayed
    expect(screen.queryByText('Movie 1')).not.toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
  });

  // TC_ML_004: Verify marking an item as watched
  test('TC_ML_004: Verify marking an item as watched', async () => {
    // Mock API requests
    global.fetch = jest.fn()
      // First request to get my list
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 1,
              title: 'Movie 1',
              thumbnail: '/path/to/thumbnail1.jpg',
              watched: false,
              addedAt: '2025-04-01T14:30:00Z'
            }
          ]
        })
      })
      // Second request to mark as watched
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      // Third request to get updated list
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 1,
              title: 'Movie 1',
              thumbnail: '/path/to/thumbnail1.jpg',
              watched: true,
              addedAt: '2025-04-01T14:30:00Z'
            }
          ]
        })
      });
    
    render(<MyListPage />);
    
    // Wait for the initial list to load
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
    });
    
    // Find and click the "Mark as Watched" button
    const markAsWatchedButton = screen.getByRole('button', { name: /mark as watched/i });
    fireEvent.click(markAsWatchedButton);
    
    // Verify the UI updates to show the item as watched
    await waitFor(() => {
      expect(screen.getByText(/watched/i)).toBeInTheDocument();
    });
  });

  // TC_ML_005: Verify removing an item from My List
  test('TC_ML_005: Verify removing an item from My List', async () => {
    // Mock API requests
    global.fetch = jest.fn()
      // First request to get my list
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 1,
              title: 'Movie 1',
              thumbnail: '/path/to/thumbnail1.jpg',
              watched: true,
              addedAt: '2025-04-01T14:30:00Z'
            },
            {
              id: 2,
              title: 'Movie 2',
              thumbnail: '/path/to/thumbnail2.jpg',
              watched: false,
              addedAt: '2025-04-02T18:45:00Z'
            }
          ]
        })
      })
      // Second request to remove the item
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      // Third request to get updated list
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 2,
              title: 'Movie 2',
              thumbnail: '/path/to/thumbnail2.jpg',
              watched: false,
              addedAt: '2025-04-02T18:45:00Z'
            }
          ]
        })
      });
    
    render(<MyListPage />);
    
    // Verify both movies are initially displayed
    await waitFor(() => {
      expect(screen.getByText('Movie 1')).toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
    
    // Find and click the remove button for Movie 1
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    
    // Confirm the removal in the dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Verify Movie 1 is removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Movie 1')).not.toBeInTheDocument();
      expect(screen.getByText('Movie 2')).toBeInTheDocument();
    });
  });

  // TC_ML_006: Verify empty My List shows appropriate message
  test('TC_ML_006: Verify empty My List shows appropriate message', async () => {
    // Mock API request for empty my list
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] })
    });
    
    render(<MyListPage />);
    
    // Verify empty state message is displayed
    await waitFor(() => {
      expect(screen.getByText(/your list is empty/i)).toBeInTheDocument();
    });
  });
});