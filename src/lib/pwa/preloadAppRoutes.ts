type RoutePreload = {
  id: string;
  load: () => Promise<unknown>;
};

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type PreloadOptions = {
  delayMs?: number;
  gapMs?: number;
  routes?: RoutePreload[];
};

const DEFAULT_DELAY_MS = 2200;
const DEFAULT_GAP_MS = 650;

export const LIKELY_APP_ROUTE_PRELOADS: RoutePreload[] = [
  { id: "home", load: () => import("@/pages/HomePage") },
  { id: "journal", load: () => import("@/pages/journal/JournalPage") },
  { id: "my-ai", load: () => import("@/pages/myai/MyAiPage") },
  { id: "reader", load: () => import("@/pages/reader/ReaderPage") },
  { id: "framework", load: () => import("@/pages/framework/FrameworkDashboard") },
];

export function shouldPreloadLikelyAppRoutes(nav: Navigator = navigator): boolean {
  const connection = (nav as Navigator & { connection?: NetworkInformationLike }).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  return true;
}

export function preloadLikelyAppRoutes(options: PreloadOptions = {}): () => void {
  if (typeof window === "undefined" || !shouldPreloadLikelyAppRoutes()) return () => undefined;

  const routes = options.routes ?? LIKELY_APP_ROUTE_PRELOADS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const gapMs = options.gapMs ?? DEFAULT_GAP_MS;
  let cancelled = false;
  let timeoutId: number | null = null;
  let idleId: number | null = null;

  const clearTimers = () => {
    if (timeoutId != null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (idleId != null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleId);
      idleId = null;
    }
  };

  const scheduleIdle = (callback: () => void) => {
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(
        (_deadline: IdleDeadlineLike) => {
          idleId = null;
          callback();
        },
        { timeout: 1800 },
      );
      return;
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      callback();
    }, 1);
  };

  const loadRoute = (index: number) => {
    if (cancelled || index >= routes.length) return;

    void routes[index].load().catch((error) => {
      console.debug?.("[pwa:preload-route]", routes[index].id, error);
    });

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      scheduleIdle(() => loadRoute(index + 1));
    }, gapMs);
  };

  timeoutId = window.setTimeout(() => {
    timeoutId = null;
    scheduleIdle(() => loadRoute(0));
  }, delayMs);

  return () => {
    cancelled = true;
    clearTimers();
  };
}
