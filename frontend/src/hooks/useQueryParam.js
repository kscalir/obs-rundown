import { useCallback, useEffect, useRef, useState } from "react";

// Keeps a single query param in sync with state.
// - parse: string -> value
// - serialize: value -> string|null  (null removes the param)
export function useQueryParam(key, { parse = v => v, serialize = v => (v ?? null) } = {}) {
  const get = useCallback(() => {
    const sp = new URLSearchParams(window.location.search);
    const val = sp.get(key);
    return val == null ? null : parse(val);
  }, [key, parse]);

  const [value, setValue] = useState(() => get());
  const skip = useRef(false);

  // update when user hits back/forward
  useEffect(() => {
    const onPop = () => {
      skip.current = true;
      setValue(get());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [get]);

  // push to URL when value changes
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const sp = new URLSearchParams(window.location.search);
    const out = serialize(value);
    if (out == null) sp.delete(key); else sp.set(key, out);
    const url = `${window.location.pathname}?${sp.toString()}${window.location.hash}`;
    window.history.replaceState({}, "", url);
  }, [key, value, serialize]);

  return [value, setValue];
}