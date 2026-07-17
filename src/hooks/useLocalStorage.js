import { useState, useEffect, useRef } from 'react';

// Drop-in replacement for useState that persists to localStorage.
// - `key` should be unique per field (we namespace with "promptFoundry.").
// - `sanitize(parsedValue)` runs once, right after loading from storage,
//   so callers can clean up state that shouldn't survive a reload
//   (e.g. an in-flight "loading" status with no request behind it anymore).
export function useLocalStorage(key, initialValue, sanitize) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initialValue;
      const parsed = JSON.parse(raw);
      return sanitize ? sanitize(parsed) : parsed;
    } catch (e) {
      console.warn(`Prompt Foundry: could not load "${key}" from local storage`, e);
      return initialValue;
    }
  });

  const timerRef = useRef(null);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // Most likely storage quota exceeded (e.g. very large attachments
        // once image support lands) — fail quietly, don't break the UI.
        console.warn(`Prompt Foundry: could not save "${key}" to local storage`, e);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [key, value]);

  return [value, setValue];
}
