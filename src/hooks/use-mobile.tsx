import * as React from "react";
import { readIsCompactViewport } from "@/lib/shell/viewport";

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(readIsCompactViewport);

  React.useEffect(() => {
    const onChange = () => {
      setIsMobile(readIsCompactViewport());
    };
    onChange();
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    window.visualViewport?.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.visualViewport?.removeEventListener("resize", onChange);
    };
  }, []);

  return isMobile;
}
