import { Request, Response } from 'express';
import fetch from 'node-fetch';

interface StreamingOptions {
  timeout?: number;
  maxRetries?: number;
  bufferSize?: number;
  enableCaching?: boolean;
}

export class StreamingUtility {
  private static defaultOptions: StreamingOptions = {
    timeout: 30000,
    maxRetries: 3,
    bufferSize: 64 * 1024, // 64KB chunks
    enableCaching: true
  };

  /**
   * Proxy and optimize video streams with proper error handling
   */
  static async proxyStream(
    req: Request, 
    res: Response, 
    streamUrl: string, 
    options: StreamingOptions = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    let retryCount = 0;

    const attemptStream = async (): Promise<void> => {
      try {
        // Set streaming headers
        this.setStreamingHeaders(res);

        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

        const response = await fetch(streamUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'FilmFlex-Server/1.0',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            ...(req.headers.range && { 'Range': req.headers.range }),
            ...(req.headers['accept-ranges'] && { 'Accept-Ranges': req.headers['accept-ranges'] })
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Stream server responded with ${response.status}: ${response.statusText}`);
        }

        // Set response headers from upstream
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const acceptRanges = response.headers.get('accept-ranges');

        if (contentType) res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

        // Handle range requests properly
        if (req.headers.range && response.status === 206) {
          res.status(206);
          const contentRange = response.headers.get('content-range');
          if (contentRange) res.setHeader('Content-Range', contentRange);
        }

        // Pipe the response with error handling
        if (response.body) {
          response.body.on('error', (error) => {
            console.error('Stream pipe error:', error);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Streaming error occurred' });
            }
          });

          response.body.pipe(res);
        } else {
          throw new Error('No response body received from stream');
        }

      } catch (error) {
        console.error(`Stream attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < opts.maxRetries! && !res.headersSent) {
          retryCount++;
          console.log(`Retrying stream (attempt ${retryCount + 1}/${opts.maxRetries! + 1})`);
          setTimeout(() => attemptStream(), 1000 * retryCount);
        } else if (!res.headersSent) {
          res.status(500).json({
            error: 'Stream unavailable',
            message: error instanceof Error ? error.message : 'Unknown streaming error',
            retries: retryCount
          });
        }
      }
    };

    await attemptStream();
  }

  /**
   * Set appropriate headers for video streaming
   */
  private static setStreamingHeaders(res: Response): void {
    // CORS headers for video streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

    // Cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  }

  /**
   * Validate and sanitize stream URLs
   */
  static validateStreamUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Check for supported protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      // Check for supported file extensions
      const supportedExtensions = ['.m3u8', '.mp4', '.webm', '.ts'];
      const hasValidExtension = supportedExtensions.some(ext => 
        parsed.pathname.toLowerCase().includes(ext)
      );

      return hasValidExtension;
    } catch {
      return false;
    }
  }

  /**
   * Get stream metadata without downloading the full stream
   */
  static async getStreamMetadata(streamUrl: string): Promise<{
    contentType?: string;
    contentLength?: string;
    supportsRanges?: boolean;
    isLive?: boolean;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(streamUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'FilmFlex-Server/1.0'
        }
      });

      clearTimeout(timeoutId);

      return {
        contentType: response.headers.get('content-type') || undefined,
        contentLength: response.headers.get('content-length') || undefined,
        supportsRanges: response.headers.get('accept-ranges') === 'bytes',
        isLive: response.headers.get('content-type')?.includes('m3u8') || false
      };
    } catch (error) {
      console.error('Failed to get stream metadata:', error);
      return {};
    }
  }

  /**
   * Health check for stream availability
   */
  static async checkStreamHealth(streamUrl: string): Promise<{
    available: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(streamUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'FilmFlex-Server/1.0'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        available: response.ok,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        available: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default StreamingUtility;