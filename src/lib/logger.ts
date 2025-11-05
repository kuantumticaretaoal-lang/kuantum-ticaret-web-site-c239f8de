/**
 * Environment-aware logger utility
 * Prevents sensitive data exposure in production
 */

export const logger = {
  error: (message: string, error?: any) => {
    if (import.meta.env.DEV) {
      console.error(message, error);
    }
    // In production, errors are silently caught
    // Consider integrating error tracking service like Sentry
  },
  
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(message, data);
    }
  },
  
  warn: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.warn(message, data);
    }
  }
};
