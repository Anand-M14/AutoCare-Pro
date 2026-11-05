import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../lib/api";

/**
 * Runs `fn(signalInfo)` whenever `deps` change. Stale responses are ignored.
 * Returns { data, loading, error, reload }.
 */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const tick = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (silent = false) => {
    const id = ++tick.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await fnRef.current();
      if (id === tick.current) setState({ data, loading: false, error: "" });
    } catch (err) {
      if (id === tick.current) setState((s) => ({ ...s, loading: false, error: errorMessage(err, "Could not load this data.") }));
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  useEffect(() => () => { tick.current += 1; }, []);

  return { ...state, reload: () => run(), refresh: () => run(true) };
}
