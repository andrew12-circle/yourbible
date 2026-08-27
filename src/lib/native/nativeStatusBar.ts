let darkSurfaceCount = 0;
const subscribers = new Set<() => void>();

function notify(): void {
  subscribers.forEach((listener) => listener());
}

export function readNativeDarkSurfaceActive(): boolean {
  return darkSurfaceCount > 0;
}

export function subscribeNativeDarkSurface(listener: () => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

/** Temporarily request light status-bar icons for a dark native modal surface. */
export function acquireNativeDarkStatusSurface(): () => void {
  darkSurfaceCount += 1;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    darkSurfaceCount = Math.max(0, darkSurfaceCount - 1);
    notify();
  };
}

export function nativeStatusBarNeedsLightIcons(options: {
  pathname: string;
  resolvedTheme?: string;
  darkSurfaceActive: boolean;
}): boolean {
  if (options.darkSurfaceActive || options.resolvedTheme === "dark") return true;
  if (options.pathname === "/home" || options.pathname === "/sleep") {
    return true;
  }
  return (
    options.pathname.startsWith("/journal") &&
    options.pathname !== "/journal/new" &&
    !options.pathname.startsWith("/journal/chat") &&
    !options.pathname.endsWith("/edit")
  );
}
