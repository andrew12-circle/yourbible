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

export type NativeStatusBarAppearance = {
  backgroundColor: "#000000" | "#FFFFFF";
  lightIcons: boolean;
};

export function resolveNativeStatusBarAppearance(options: {
  resolvedTheme?: string;
  darkSurfaceActive: boolean;
}): NativeStatusBarAppearance {
  const dark = options.darkSurfaceActive || options.resolvedTheme === "dark";
  return {
    backgroundColor: dark ? "#000000" : "#FFFFFF",
    lightIcons: dark,
  };
}
