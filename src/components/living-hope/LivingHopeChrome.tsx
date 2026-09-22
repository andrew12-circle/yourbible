import "./morningFormula.css";
import { useEffect, useRef } from "react";
import { useVisualViewportMetrics } from "@/hooks/useKeyboardInset";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { hubShellPageHeight } from "@/lib/shell/hubShellClasses";
import { cn } from "@/lib/utils";

type Props = {
  session?: boolean;
  stepKey?: string;
  footer?: React.ReactNode;
  title?: string;
  subtitle?: string;
  backTo?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fillHeight?: boolean;
  /** Hub landing: large title lives in page body, not the nav bar. */
  hubLanding?: boolean;
};

export function LivingHopeChrome({
  session = false,
  stepKey,
  footer,
  title = "Morning formula",
  subtitle,
  backTo = "/living-hope",
  right,
  children,
  className,
  fillHeight = true,
  hubLanding = false,
}: Props) {
  const { showHubShell } = useAppShellMode();
  const viewport = useVisualViewportMetrics();
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!session) return;
    content.current?.scrollTo?.({ top: 0, behavior: "instant" });
    content.current?.querySelector<HTMLElement>("[data-morning-heading]")?.focus({ preventScroll: true });
  }, [session, stepKey]);
  const showNav = !hubLanding || !showHubShell;
  /** Native/mobile landings need a real Home action; Hub landings use the sidebar. */
  const showBack = !hubLanding || !showHubShell;
  const effectiveBackTo = hubLanding && !showHubShell ? "/home" : backTo;
  const backLabel =
    effectiveBackTo === "/home"
      ? "Home"
      : effectiveBackTo === "/living-hope"
        ? "Morning formula"
        : "Back";

  return (
    <div
      className={cn(
        "living-hope-root flex flex-col relative overflow-hidden",
        showHubShell ? "bg-background text-foreground" : "bg-background text-foreground min-h-[100dvh]",
        showHubShell
          ? hubShellPageHeight(showHubShell)
          : fillHeight
            ? "min-h-[100dvh]"
            : "",
        session && "min-h-0 bg-background",
        className,
      )}
      style={session && !showHubShell ? { height: viewport.viewportHeight || "100dvh", minHeight: 0 } : undefined}
    >
      {showNav ? (
        <header className="relative z-10 flex items-center justify-between px-4 md:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 shrink-0">
          {showBack ? (
              <Button asChild
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary -ml-2 h-11 px-2 font-normal text-[17px] gap-0.5 max-w-[42vw] sm:max-w-none"
              >
                <Link to={effectiveBackTo} aria-label={session ? "Exit morning" : backLabel}>
                  <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden strokeWidth={2.5} />
                  <span className={session ? "sr-only" : "truncate"}>{backLabel}</span>
                </Link>
              </Button>
          ) : (
            <div className="w-9 shrink-0" aria-hidden />
          )}
          <span className="text-[15px] font-semibold tracking-tight truncate max-w-[50%]">{title}</span>
          <div className="flex justify-end shrink-0 min-w-[3.25rem] -mr-1 pt-0.5">{right}</div>
        </header>
      ) : null}

      {subtitle && showNav ? (
        <p
          className={cn(
            "relative z-10 px-4 md:px-6 -mt-0.5 mb-2 text-[13px] text-muted-foreground text-center",
            showHubShell && "md:text-left md:px-6 lg:px-8",
          )}
        >
          {subtitle}
        </p>
      ) : null}

      <main ref={content}
        className={cn(
          "relative z-10 flex-1 flex flex-col w-full min-w-0 min-h-0",
          session ? "mx-auto max-w-3xl px-5 sm:px-8 pb-6 overflow-y-auto overscroll-contain" : showHubShell
            ? "max-w-none mx-0 px-4 md:px-6 lg:px-8 pb-6 overflow-y-auto scrollbar-hide"
            : "max-w-lg mx-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
      {session && footer && <footer className="shrink-0 border-t border-border/40 bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><div className="mx-auto max-w-[42rem]">{footer}</div></footer>}
    </div>
  );
}
