import { useRef, useCallback } from 'react';

export const useThrottledRequest = (delay = 1000) => {
  const timeoutRef = useRef(null);
  const lastCallRef = useRef(0);

  const throttledRequest = useCallback((requestFn) => {
    const now = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If enough time has passed since last call, execute immediately
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      return requestFn();
    }

    // Otherwise, schedule the call
    timeoutRef.current = setTimeout(() => {
      lastCallRef.current = Date.now();
      requestFn();
    }, delay - (now - lastCallRef.current));
  }, [delay]);

  return throttledRequest;
}; 