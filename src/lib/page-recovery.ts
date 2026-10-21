const RECOVERY_KEY = "kuantum:asset-recovery";
let recoveredInMemory = false;

export function isAssetLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(message);
}

export function recoverAssetLoad(error: unknown): boolean {
  if (!isAssetLoadError(error) || !navigator.onLine || recoveredInMemory) return false;
  try {
    if (sessionStorage.getItem(RECOVERY_KEY)) return false;
    sessionStorage.setItem(RECOVERY_KEY, "1");
  } catch { /* Still prevent reload loops in storage-restricted browsers. */ return false; }
  recoveredInMemory = true;
  window.location.reload();
  return true;
}

export function installPageRecovery() {
  const preload = (event: Event) => {
    const error = (event as Event & { payload?: unknown }).payload;
    if (recoverAssetLoad(error)) event.preventDefault();
  };
  window.addEventListener("vite:preloadError", preload);
}