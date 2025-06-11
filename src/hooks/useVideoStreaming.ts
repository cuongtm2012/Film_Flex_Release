import { useState, useEffect, useCallback, useRef } from 'react';

export interface StreamHealth {
  isAvailable: boolean;
  responseTime: number;
  quality: string;
  error?: string;
}

export interface StreamingOptions {
  enableProxy: boolean;
  preferredQuality: string;
  retryAttempts: number;
  timeout: number;
}

export interface UseVideoStreamingReturn {
  currentUrl: string | null;
  isLoading: boolean;
  error: string | null;
  health: StreamHealth | null;
  optimizeStream: (url: string, options?: Partial<StreamingOptions>) => Promise<void>;
  checkHealth: (url: string) => Promise<void>;
  resetError: () => void;
}

const defaultOptions: StreamingOptions = {
  enableProxy: true,
  preferredQuality: 'auto',
  retryAttempts: 3,
  timeout: 10000
};

export const useVideoStreaming = (): UseVideoStreamingReturn => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<StreamHealth | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const checkHealth = useCallback(async (url: string) => {
    if (!url) return;

    setIsLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/stream/health?url=${encodeURIComponent(url)}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status) {
        setHealth(result.data);
      } else {
        throw new Error(result.message || 'Health check failed');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        setHealth({
          isAvailable: false,
          responseTime: 0,
          quality: 'unknown',
          error: err.message
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const optimizeStream = useCallback(async (url: string, options: Partial<StreamingOptions> = {}) => {
    if (!url) {
      setError('URL is required');
      return;
    }

    const streamOptions = { ...defaultOptions, ...options };
    setIsLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    let attempts = 0;
    const maxAttempts = streamOptions.retryAttempts;

    while (attempts < maxAttempts) {
      try {
        const queryParams = new URLSearchParams({
          url: url,
          quality: streamOptions.preferredQuality
        });

        const response = await fetch(`/api/stream/proxy?${queryParams}`, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Stream optimization failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status) {
          setCurrentUrl(result.data.optimizedUrl || result.data.originalUrl);
          
          // Update health info if available
          if (result.data.metadata) {
            setHealth({
              isAvailable: true,
              responseTime: result.data.metadata.responseTime || 0,
              quality: result.data.quality || 'unknown'
            });
          }
          
          break; // Success, exit retry loop
        } else {
          throw new Error(result.message || 'Stream optimization failed');
        }
      } catch (err) {
        attempts++;
        
        if (err instanceof Error && err.name === 'AbortError') {
          break; // Request was cancelled
        }
        
        if (attempts >= maxAttempts) {
          // All attempts failed, fall back to original URL
          setCurrentUrl(url);
          setError(err instanceof Error ? err.message : 'Stream optimization failed');
          
          // Try to check health of original URL
          await checkHealth(url);
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    setIsLoading(false);
  }, [checkHealth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    currentUrl,
    isLoading,
    error,
    health,
    optimizeStream,
    checkHealth,
    resetError
  };
};