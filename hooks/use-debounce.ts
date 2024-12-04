import { useCallback, useRef, useEffect } from 'react';
import type { DebouncedFunction, DebounceOptions } from '@/types';

const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: Partial<DebounceOptions> = {}
): DebouncedFunction<T> => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  const lastCalledRef = useRef<number>(0);
  const argsRef = useRef<Parameters<T>>();
  const lastArgsRef = useRef<Parameters<T>>();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      argsRef.current = args;

      const argsAreEqual =
        lastArgsRef.current &&
        args.length === lastArgsRef.current.length &&
        args.every((arg, index) => arg === lastArgsRef.current![index]);

      if (timeoutRef.current && argsAreEqual) {
        return;
      }
      lastArgsRef.current = args;

      if (
        options.maxWait &&
        lastCalledRef.current &&
        now - lastCalledRef.current >= options.maxWait
      ) {
        lastCalledRef.current = now;
        return callbackRef.current(...args);
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (options.leading && !timeoutRef.current) {
        lastCalledRef.current = now;
        return callbackRef.current(...args);
      }

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
};

export { useDebounce };
