/**
 * Clears the PWA service worker and Cache Storage, then hard-reloads.
 * Does not touch localStorage, IndexedDB, or auth — you stay signed in.
 */
export async function forceAppRefresh(): Promise<void> {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  // Bypass HTTP cache: navigate with a bust param, then drop it on the next load.
  const url = new URL(window.location.href);
  url.searchParams.set("_app_refresh", String(Date.now()));
  window.location.replace(url.toString());
}

/** Strip the one-time refresh query param after a forced reload. */
export function stripAppRefreshParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("_app_refresh")) return;
  url.searchParams.delete("_app_refresh");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", next || "/");
}
