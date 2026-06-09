import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { persistMiniPhoneActiveRoute } from "@/lib/mini-phone/miniPhoneStorage";

/** Persists in-phone navigation to session storage without triggering parent re-renders. */
export function MiniPhoneRoutePersist() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    persistMiniPhoneActiveRoute(`${pathname}${search}`);
  }, [pathname, search]);

  return null;
}
