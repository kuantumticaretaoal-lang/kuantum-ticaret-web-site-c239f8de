// Browser preferences must never prevent the storefront from rendering.
const fallback = new Map<string, string>();

export const browserStorage: Storage = {
  get length() {
    try { return window.localStorage.length; } catch { return fallback.size; }
  },
  clear() {
    fallback.clear();
    try { window.localStorage.clear(); } catch { /* unavailable */ }
  },
  getItem(key: string) {
    try { return window.localStorage.getItem(key) ?? fallback.get(key) ?? null; }
    catch { return fallback.get(key) ?? null; }
  },
  key(index: number) {
    try { return window.localStorage.key(index); }
    catch { return Array.from(fallback.keys())[index] ?? null; }
  },
  removeItem(key: string) {
    fallback.delete(key);
    try { window.localStorage.removeItem(key); } catch { /* unavailable */ }
  },
  setItem(key: string, value: string) {
    fallback.set(key, String(value));
    try { window.localStorage.setItem(key, String(value)); } catch { /* memory fallback */ }
  },
};

export function readStoredArray<T>(key: string, isValid: (value: unknown) => value is T): T[] {
  try {
    const value: unknown = JSON.parse(browserStorage.getItem(key) ?? "[]");
    if (Array.isArray(value)) return value.filter(isValid);
  } catch { /* discard malformed preferences, not the user's session */ }
  browserStorage.removeItem(key);
  return [];
}