import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal data-fetching hook — Axios-friendly, no cache, no dedup.
 * Ported pattern from core-frontend. (No react-query, per house rule.)
 */
interface UseQueryOptions<T> {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
}

interface UseQueryResult<T> {
  data: T | null;
  error: unknown;
  isLoading: boolean;
  /** Re-run the fetcher. Stable + void, so domain hooks re-expose it directly. */
  refresh: () => Promise<void>;
}

export function useQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = [],
  options: UseQueryOptions<T> = {},
): UseQueryResult<T> {
  const { enabled = true, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const abortRef = useRef<AbortController | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const run = useCallback(async () => {
    if (!enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher(controller.signal);
      if (controller.signal.aborted) return;
      setData(result);
      onSuccessRef.current?.(result);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err);
      onErrorRef.current?.(err);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    void run();
    return () => abortRef.current?.abort();
  }, [run]);

  return { data, error, isLoading, refresh: run };
}
