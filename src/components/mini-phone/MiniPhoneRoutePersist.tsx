import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useMiniPhone } from "@/contexts/MiniPhoneContext";

/** Mirrors in-phone navigation into session storage so reopening restores the last screen. */
export function MiniPhoneRoutePersist() {
  const { pathname, search } = useLocation();
  const { syncRoute } = useMiniPhone();

  useEffect(() => {
    syncRoute(`${pathname}${search}`);
  }, [pathname, search, syncRoute]);

  return null;
}
