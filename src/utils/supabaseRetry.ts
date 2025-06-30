import { PostgrestError } from '@supabase/supabase-js';

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Don't retry on authentication errors or client errors
    if (error?.code === 'PGRST301' || error?.code === '42501') {
      return false; // Auth errors
    }
    if (error?.status >= 400 && error?.status < 500) {
      return false; // Client errors
    }
    // Retry on network errors, timeouts, and server errors
    return true;
  },
  onRetry: (error: any, attempt: number) => {
    console.warn(`Retry attempt ${attempt} after error:`, error?.message || error);
  }
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number, 
  initialDelay: number, 
  maxDelay: number, 
  backoffMultiplier: number
): number {
  // Exponential backoff with jitter
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5);
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Retry a Supabase query with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // Call retry callback
      opts.onRetry(error, attempt);

      // Calculate and apply delay
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry a Supabase query that returns data and error
 */
export async function withRetrySupabase<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: RetryOptions
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastResult: { data: T | null; error: PostgrestError | null } = { data: null, error: null };

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (result.error) {
        lastResult = result;
        
        // Check if we should retry
        if (attempt === opts.maxAttempts || !opts.shouldRetry(result.error, attempt)) {
          return result;
        }

        // Call retry callback
        opts.onRetry(result.error, attempt);

        // Calculate and apply delay
        const delay = calculateDelay(
          attempt,
          opts.initialDelay,
          opts.maxDelay,
          opts.backoffMultiplier
        );
        await sleep(delay);
      } else {
        // Success
        return result;
      }
    } catch (error) {
      // Handle unexpected errors
      lastResult = { data: null, error: error as PostgrestError };
      
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      opts.onRetry(error, attempt);
      
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );
      await sleep(delay);
    }
  }

  return lastResult;
}

/**
 * Create a retry wrapper with custom default options
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return {
    withRetry: <T>(operation: () => Promise<T>, options?: RetryOptions) => 
      withRetry(operation, { ...defaultOptions, ...options }),
    withRetrySupabase: <T>(
      operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
      options?: RetryOptions
    ) => withRetrySupabase(operation, { ...defaultOptions, ...options })
  };
} 