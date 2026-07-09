import { useRef, useState } from "react";
import { useMiniPhoneEmbed } from "@/contexts/MiniPhoneEmbedContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useLockBodyScrollWhenKeyboardActive,
  useVisualViewportMetrics,
} from "@/hooks/useKeyboardInset";
import {
  mobileBottomDockStyle,
  mobileVisualViewportPageStyle,
} from "@/lib/shell/mobileShellClasses";
import type { CSSProperties } from "react";

export function useMobileComposerDock(showHubShell: boolean) {
  const { keyboardInset: kbInset, offsetTop: vvOffsetTop, viewportHeight } =
    useVisualViewportMetrics();
  const inMiniPhone = useMiniPhoneEmbed();
  const isMobile = useIsMobile();
  const [composerFocused, setComposerFocused] = useState(false);
  const lockScrollYRef = useRef<number | null>(null);

  const keyboardOpen = kbInset > 0;
  const mobileKeyboardLayout = !showHubShell && (isMobile || inMiniPhone) && keyboardOpen;

  useLockBodyScrollWhenKeyboardActive(
    !inMiniPhone && !isMobile && composerFocused,
    lockScrollYRef,
  );

  const pageStyle = mobileVisualViewportPageStyle({
    keyboardInset: kbInset,
    offsetTop: vvOffsetTop,
    viewportHeight,
    enabled: mobileKeyboardLayout,
  });

  const dockStyle = mobileBottomDockStyle({ keyboardInset: kbInset });

  const headerOffsetStyle: CSSProperties | undefined =
    vvOffsetTop > 0 ? { top: vvOffsetTop } : undefined;

  return {
    kbInset,
    vvOffsetTop,
    keyboardOpen,
    composerFocused,
    setComposerFocused,
    lockScrollYRef,
    pageStyle,
    dockStyle,
    headerOffsetStyle,
  };
}
