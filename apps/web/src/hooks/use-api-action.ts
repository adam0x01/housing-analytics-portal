"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export function useApiAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = useCallback(
    async <T>(
      action: (signal: AbortSignal) => Promise<T>,
    ): Promise<T | undefined> => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setPending(true);
      setError(null);
      try {
        const result = await action(current.signal);
        return current.signal.aborted ? undefined : result;
      } catch (failure) {
        if (!current.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Something went wrong. Please try again.",
          );
        return undefined;
      } finally {
        if (controller.current === current) setPending(false);
      }
    },
    [],
  );
  return { run, pending, error, clearError: () => setError(null) };
}
