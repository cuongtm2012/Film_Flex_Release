// Streaming utilities for handling video content
export class StreamingUtils {
  /**
   * Validates if a URL is a valid streaming source
   */
  static isValidStreamingUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // Add valid streaming domains/patterns here
      const validDomains = [
        'vidsrc.me',
        'vidsrc.to',
        'vidsrc.net',
        'embedsb.com',
        'doodstream.com',
        'streamtape.com',
        'mixdrop.co',
        'upstream.to'
      ];
      
      return validDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  /**
   * Extracts video ID from streaming URLs
   */
  static extractVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract ID from common URL patterns
      const idMatch = pathname.match(/\/(?:embed\/|e\/|v\/)?([a-zA-Z0-9_-]+)$/);
      return idMatch ? idMatch[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Generates embed URL for supported streaming platforms
   */
  static generateEmbedUrl(videoId: string, platform: string): string {
    const embedUrls: Record<string, string> = {
      'vidsrc': `https://vidsrc.me/embed/movie?imdb=${videoId}`,
      'vidsrc.to': `https://vidsrc.to/embed/movie/${videoId}`,
      'embedsb': `https://embedsb.com/e/${videoId}`,
      'doodstream': `https://doodstream.com/e/${videoId}`,
      'streamtape': `https://streamtape.com/e/${videoId}`,
      'mixdrop': `https://mixdrop.co/e/${videoId}`,
      'upstream': `https://upstream.to/e/${videoId}`
    };
    
    return embedUrls[platform] || '';
  }
  /**
   * Checks if streaming source is available
   */
  static async checkSourceAvailability(url: string): Promise<boolean> {
    try {
      // Use AbortController for timeout instead of deprecated timeout option
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes streaming URL for security
   */
  static sanitizeStreamingUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove potentially dangerous parameters
      const dangerousParams = ['script', 'javascript', 'data', 'vbscript'];
      dangerousParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch {
      return '';
    }
  }
  /**
   * Gets streaming quality options if available
   */
  static getQualityOptions(_url: string): string[] {
    const defaultQualities = ['360p', '480p', '720p', '1080p'];
    
    // This would normally check the actual streaming source
    // For now, return default options
    return defaultQualities;
  }

  /**
   * Formats streaming source for display
   */
  static formatSourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      
      // Capitalize first letter and remove common prefixes
      return hostname
        .split('.')[0]
        .charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
      return 'Unknown Source';
    }
  }
  /**
   * Optimizes streaming URL for better performance
   */
  static async optimizeStream(url: string, quality: string): Promise<{ success: boolean; optimizedUrl?: string; error?: string }> {
    try {
      const urlObj = new URL(url);
      
      // Add quality parameter if supported
      if (quality && ['360p', '480p', '720p', '1080p'].includes(quality)) {
        urlObj.searchParams.set('quality', quality);
      }
      
      // Add optimization parameters
      urlObj.searchParams.set('autoplay', '1');
      urlObj.searchParams.set('muted', '1');
      
      return {
        success: true,
        optimizedUrl: urlObj.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize stream'
      };
    }
  }

  /**
   * Checks the health/availability of a streaming source
   */
  static async checkStreamHealth(url: string): Promise<{ healthy: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: response.ok,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
