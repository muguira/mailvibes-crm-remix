import { useState, useEffect } from 'react';

/**
 * Hook to debounce a value
 * @param value The value to debounce
 * @param delay The delay in milliseconds (default: 200ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes (or component unmounts)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
} 