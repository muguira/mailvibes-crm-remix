/**
 * Logger utility that only logs in development mode
 * This prevents console statements from appearing in production builds
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args)
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  // For production errors that should always be logged
  // (e.g., critical errors that need to be reported)
  critical: (...args: any[]) => {
    console.error(...args)
  },
}

// Convenience export for destructuring
export const { log, error, warn, debug, info, critical } = logger
