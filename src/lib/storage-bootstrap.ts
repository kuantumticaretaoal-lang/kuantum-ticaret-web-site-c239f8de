// Generated auth clients read localStorage during module evaluation.
// Install a tab-scoped fallback before importing those clients, without modifying them.
export function ensureBrowserStorage(target: Window) {
  try {
    const storage = target.localStorage;
    storage.getItem("kuantum:storage-probe");
    return;
  } catch { /* Storage access may be denied in embedded/private browsers. */ }
  const values = new Map<string, string>();
  const memory: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
  Object.defineProperty(target, "localStorage", { configurable: true, value: memory });
}

if (typeof window !== "undefined") ensureBrowserStorage(window);