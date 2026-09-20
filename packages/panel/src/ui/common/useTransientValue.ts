import { useCallback, useEffect, useRef, useState } from 'react';

/** A value that resets to null after `durationMs`: "Copied" on a button for a moment. */
export function useTransientValue<Value>(
  durationMs: number,
): [Value | null, (value: Value) => void] {
  const [value, setValue] = useState<Value | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback(
    (next: Value) => {
      setValue(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setValue(null), durationMs);
    },
    [durationMs],
  );
  return [value, show];
}
