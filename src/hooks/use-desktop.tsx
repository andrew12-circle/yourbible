import * as React from "react";

/** Returns true on viewports >= breakpoint (default 1024 = lg). */
export function useIsDesktop(breakpoint = 1024) {
  const [is, setIs] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false,
  );
  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const onChange = () => setIs(window.innerWidth >= breakpoint);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);
  return is;
}