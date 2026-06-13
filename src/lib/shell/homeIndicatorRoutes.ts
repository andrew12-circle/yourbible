export function isArtifactDetailRoute(pathname: string): boolean {
  return (
    /^\/framework\/artifacts\/[^/]+$/.test(pathname) &&
    pathname !== "/framework/artifacts/new" &&
    pathname !== "/framework/artifacts/live"
  );
}

/** Routes with a fixed bottom composer — hide the home-indicator pill. */
export function hasBottomComposerRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/my-ai") ||
    pathname.startsWith("/journal/chat") ||
    pathname === "/framework/chat/legacy"
  );
}

/** Bible reader with fixed bottom dock — hide the home-indicator pill. */
export function hasReaderMobileDockRoute(pathname: string, showHubShell: boolean): boolean {
  return !showHubShell && pathname.startsWith("/read/");
}

export function homeIndicatorHidden(pathname: string, showHubShell: boolean): boolean {
  return (
    showHubShell ||
    pathname === "/" ||
    pathname === "/home" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    isArtifactDetailRoute(pathname) ||
    hasBottomComposerRoute(pathname) ||
    hasReaderMobileDockRoute(pathname, showHubShell)
  );
}
