import { ReactNode } from "react";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import {
  mobilePageRoot,
  mobileScrollMainClass,
  mobileStickyHeaderClass,
} from "@/lib/shell/mobileShellClasses";
import { cn } from "@/lib/utils";

type MobilePageShellProps = {
  /** Override hub-shell detection (defaults to `useAppShellMode`). */
  showHubShell?: boolean;
  /** Flex column filling the viewport — for chat-style layouts. */
  fillViewport?: boolean;
  className?: string;
  hubClassName?: string;
  header?: ReactNode;
  headerClassName?: string;
  /** Rem below safe-area inset on mobile sticky headers. */
  headerSafeExtraRem?: number;
  mainClassName?: string;
  mainPaddingBottom?: string;
  children: ReactNode;
};

/**
 * Standard mobile page chrome: safe-area header, scroll main, hub-shell aware sizing.
 * Use on phone-first pages to avoid duplicating inset and dvh logic.
 */
export default function MobilePageShell({
  showHubShell: showHubShellProp,
  fillViewport = false,
  className,
  hubClassName,
  header,
  headerClassName,
  headerSafeExtraRem = 0.5,
  mainClassName,
  mainPaddingBottom = "pb-safe-28",
  children,
}: MobilePageShellProps) {
  const { showHubShell: fromContext } = useAppShellMode();
  const showHubShell = showHubShellProp ?? fromContext;

  return (
    <div className={mobilePageRoot(showHubShell, { fill: fillViewport, className, hubClassName })}>
      {header ? (
        <header
          className={mobileStickyHeaderClass(showHubShell, headerSafeExtraRem, headerClassName)}
        >
          {header}
        </header>
      ) : null}
      <main className={mobileScrollMainClass(showHubShell, cn(mainPaddingBottom, mainClassName))}>
        {children}
      </main>
    </div>
  );
}
