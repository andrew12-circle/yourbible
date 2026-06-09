export const MINI_PHONE_ACTIVE_ROUTE_KEY = "mini-phone-active-route";

export function loadMiniPhoneActiveRoute(): string | null {
  try {
    return sessionStorage.getItem(MINI_PHONE_ACTIVE_ROUTE_KEY) || null;
  } catch {
    return null;
  }
}

export function persistMiniPhoneActiveRoute(route: string | null) {
  try {
    if (route) sessionStorage.setItem(MINI_PHONE_ACTIVE_ROUTE_KEY, route);
    else sessionStorage.removeItem(MINI_PHONE_ACTIVE_ROUTE_KEY);
  } catch {
    // ignore
  }
}
