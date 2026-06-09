import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const ACTIVE_ROUTE_KEY = "mini-phone-active-route";

function loadActiveRoute(): string | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_ROUTE_KEY);
    return raw || null;
  } catch {
    return null;
  }
}

function persistActiveRoute(route: string | null) {
  try {
    if (route) sessionStorage.setItem(ACTIVE_ROUTE_KEY, route);
    else sessionStorage.removeItem(ACTIVE_ROUTE_KEY);
  } catch {
    // ignore
  }
}

interface MiniPhoneState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** null = phone home screen; otherwise in-app route inside the phone. */
  activeRoute: string | null;
  openApp: (route: string) => void;
  goHome: () => void;
  /** Keep session storage in sync when navigating inside the phone. */
  syncRoute: (route: string) => void;
}

const MiniPhoneContext = createContext<MiniPhoneState | null>(null);

const FALLBACK: MiniPhoneState = {
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
  activeRoute: null,
  openApp: () => {},
  goHome: () => {},
  syncRoute: () => {},
};

export function useMiniPhone() {
  const ctx = useContext(MiniPhoneContext);
  return ctx ?? FALLBACK;
}

export function MiniPhoneProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<string | null>(loadActiveRoute);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((p) => !p), []);

  const openApp = useCallback((route: string) => {
    setActiveRoute(route);
    persistActiveRoute(route);
    setIsOpen(true);
  }, []);

  const goHome = useCallback(() => {
    setActiveRoute(null);
    persistActiveRoute(null);
  }, []);

  const syncRoute = useCallback((route: string) => {
    setActiveRoute(route);
    persistActiveRoute(route);
  }, []);

  return (
    <MiniPhoneContext.Provider
      value={{ isOpen, open, close, toggle, activeRoute, openApp, goHome, syncRoute }}
    >
      {children}
    </MiniPhoneContext.Provider>
  );
}
