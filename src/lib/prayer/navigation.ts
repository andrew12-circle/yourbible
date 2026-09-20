export const PRAYER_TABS = [
  { id: "requests", to: "/prayer", label: "Requests" },
  { id: "overview", to: "/prayer?view=overview", label: "Overview" },
  { id: "praise", to: "/prayer/praise", label: "Praise" },
  { id: "timeline", to: "/prayer/timeline", label: "Timeline" },
] as const;

export type PrayerSection = (typeof PRAYER_TABS)[number]["id"];

/**
 * Both the main and mini-phone routers mount PrayerHubPage at /prayer.
 * Keep Overview opt-in on that shared route and preserve existing request URLs.
 */
export function getPrayerSection(pathname: string, search = ""): PrayerSection | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/prayer") {
    return new URLSearchParams(search).get("view") === "overview" ? "overview" : "requests";
  }
  if (path === "/prayer/requests" || path.startsWith("/prayer/requests/")) return "requests";
  if (path === "/prayer/praise" || path.startsWith("/prayer/praise/")) return "praise";
  if (path === "/prayer/timeline" || path.startsWith("/prayer/timeline/")) return "timeline";
  return null;
}

export function isPrayerLanding(pathname: string, search = ""): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    (path === "/prayer" || path === "/prayer/requests") &&
    getPrayerSection(pathname, search) === "requests"
  );
}
