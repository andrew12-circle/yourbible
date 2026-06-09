import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  loadMiniPhoneActiveRoute,
  persistMiniPhoneActiveRoute,
} from "@/lib/mini-phone/miniPhoneStorage";

interface MiniPhoneState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** null = phone home screen; otherwise the app entry route inside the phone. */
  activeRoute: string | null;
  openApp: (route: string) => void;
  goHome: () => void;
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
};

export function useMiniPhone() {
  const ctx = useContext(MiniPhoneContext);
  return ctx ?? FALLBACK;
}

export function MiniPhoneProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<string | null>(loadMiniPhoneActiveRoute);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((p) => !p), []);

  const openApp = useCallback((route: string) => {
    setActiveRoute(route);
    persistMiniPhoneActiveRoute(route);
    setIsOpen(true);
  }, []);

  const goHome = useCallback(() => {
    setActiveRoute(null);
    persistMiniPhoneActiveRoute(null);
  }, []);

  return (
    <MiniPhoneContext.Provider
      value={{ isOpen, open, close, toggle, activeRoute, openApp, goHome }}
    >
      {children}
    </MiniPhoneContext.Provider>
  );
}
