import '@testing-library/jest-dom';
import React from 'react';

// Mock wouter router
jest.mock('wouter', () => ({
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
  useLocation: () => ['/', jest.fn()],
  useRoute: () => [false, {}],
  Router: ({ children }: any) => React.createElement('div', {}, children)
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: any) => React.createElement('div', {}, children)
}));

// Mock authentication hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', name: 'Test User' },
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false
  })
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});