import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface MiniPhoneState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MiniPhoneContext = createContext<MiniPhoneState | null>(null);

const FALLBACK: MiniPhoneState = {
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
};

export function useMiniPhone() {
  const ctx = useContext(MiniPhoneContext);
  return ctx ?? FALLBACK;
}

export function MiniPhoneProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((p) => !p), []);

  return (
    <MiniPhoneContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MiniPhoneContext.Provider>
  );
}
