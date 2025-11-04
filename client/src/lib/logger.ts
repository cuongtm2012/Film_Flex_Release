/**
 * Logger Utility
 * Manages console logs based on environment (development vs production)
 * In production, only errors are logged. In development, all logs are shown.
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

// For backward compatibility, export individual functions
export const log = logger.log;
export const info = logger.info;
export const warn = logger.warn;
export const error = logger.error;
export const debug = logger.debug;
