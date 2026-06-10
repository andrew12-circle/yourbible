import * as React from "react";
import { useMiniPhoneEmbed } from "@/contexts/MiniPhoneEmbedContext";

/** Returns true on viewports >= breakpoint (default 1024 = lg). */
export function useIsDesktop(breakpoint = 1024) {
  const inMiniPhone = useMiniPhoneEmbed();
  const [is, setIs] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false,
  );
  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const onChange = () => setIs(window.innerWidth >= breakpoint);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);
  if (inMiniPhone) return false;
  return is;
}