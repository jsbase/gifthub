import { useCallback, useRef, useEffect } from 'react';
import type { DebouncedFunction, DebounceOptions } from '@/types';

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: Partial<DebounceOptions> = {}
): DebouncedFunction<T> {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  const lastCalledRef = useRef<number>(0);
  const argsRef = useRef<Parameters<T>>();

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      argsRef.current = args;

      // Immediate execution for maxWait
      if (
        options.maxWait &&
        lastCalledRef.current &&
        now - lastCalledRef.current >= options.maxWait
      ) {
        lastCalledRef.current = now;
        return callbackRef.current(...args);
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Leading edge execution
      if (options.leading && !timeoutRef.current) {
        lastCalledRef.current = now;
        return callbackRef.current(...args);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        if (options.trailing !== false && argsRef.current) {
          callbackRef.current(...argsRef.current);
          lastCalledRef.current = Date.now();
        }
        timeoutRef.current = undefined;
      }, delay);
    },
    [delay, options.leading, options.trailing, options.maxWait]
  );
}
