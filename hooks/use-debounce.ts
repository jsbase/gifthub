import { useCallback, useRef, useEffect } from 'react';
import type { DebouncedFunction, DebounceOptions } from '@/types';

const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: Partial<DebounceOptions> = {}
): DebouncedFunction<T> => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef(callback);
  const lastCalledRef = useRef<number>(0);
  const argsRef = useRef<Parameters<T> | undefined>(undefined);
  const lastArgsRef = useRef<Parameters<T> | undefined>(undefined);

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

      /*
        The window is armed in every case, including the leading one. It used to
        `return` from this branch, which meant `timeoutRef.current` stayed
        undefined forever whenever `leading` was set - so the same-args guard
        above could never engage, and a call site asking for a 300ms leading-edge
        debounce got a call per click. Three call sites do exactly that
        (`gift-card`, `member-list`, `language-switcher`), and all three wrap a
        destructive request or a navigation.

        The timer is the marker for "inside the window"; whether it *fires* the
        callback is a separate question, answered by `trailing` below. With
        `trailing: false` it now expires quietly, which is what leading-only
        means: the first call in each window runs, the rest are dropped.
      */
      if (options.leading && !timeoutRef.current) {
        lastCalledRef.current = now;
        callbackRef.current(...args);
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
