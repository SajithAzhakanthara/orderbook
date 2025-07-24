// app/components/hooks.js
import { useEffect, useRef, useState } from 'react';

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * rAF throttle for expensive calls (e.g., Plotly.react)
 */
export function useRafThrottle(callback) {
  const cbRef = useRef(callback);
  const tickingRef = useRef(false);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  return (...args) => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      tickingRef.current = false;
      cbRef.current(...args);
    });
  };
}
