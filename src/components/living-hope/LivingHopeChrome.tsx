import "./morningFormula.css";
import "./morningAtmosphere.css";
import "./morningSanctuary.css";
import { useEffect, useRef, type CSSProperties } from "react";
import { useVisualViewportMetrics } from "@/hooks/useKeyboardInset";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { hubShellPageHeight } from "@/lib/shell/hubShellClasses";
import { cn } from "@/lib/utils";
import { MorningPageHero } from "./MorningPageHero";
import { MorningFoundationNav } from "./MorningFoundationNav";

// The timer sits on an intentionally light surface in both themes. Its nested
// foreground and hover tokens must follow that surface, not the dark page.
const timerSurfaceTokens = {
  "--foreground": "222 22% 16%",
  "--muted-foreground": "220 8% 43%",
  "--muted": "38 22% 92%",
  "--ring": "34 76% 35%",
} as CSSProperties;

type Props = {
  session?: boolean;
  stepKey?: string;
  footer?: React.ReactNode;
  hero?: React.ReactNode;
  title?: string;
  subtitle?: string;
  backTo?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fillHeight?: boolean;
  hubLanding?: boolean;
};

export function LivingHopeChrome({ session = false, stepKey, footer, hero, title = "Morning formula", subtitle,
  backTo = "/living-hope", right, children, className, fillHeight = true, hubLanding = false }: Props) {
  const { showHubShell } = useAppShellMode();
  const { pathname } = useLocation();
  const viewport = useVisualViewportMetrics();
  const content = useRef<HTMLElement>(null);
  const hasHero = session && Boolean(hero);
  const workspace = !session && !hubLanding;
  useEffect(() => {
    if (!session && !workspace) return;
    content.current?.scrollTo?.({ top: 0, behavior: "instant" });
    content.current?.querySelector<HTMLElement>("[data-morning-heading]")?.focus({ preventScroll: true });
  }, [session, workspace, stepKey, pathname]);
  const showNav = !hubLanding || !showHubShell;
  const effectiveBackTo = hubLanding && !showHubShell ? "/home" : backTo;
  const backLabel = effectiveBackTo === "/home" ? "Home" : effectiveBackTo === "/living-hope" ? "Morning formula" : "Back";

  return <div
    className={cn("living-hope-root morning-theme flex flex-col relative overflow-hidden bg-background text-foreground",
      showHubShell ? hubShellPageHeight(showHubShell) : fillHeight ? "min-h-[100dvh]" : "",
      session && "morning-session min-h-0", hasHero && "morning-session-with-hero",
      hubLanding && "morning-hub-page", workspace && "morning-workspace-page", className)}
    data-morning-step={session ? stepKey?.split(":")[0] : undefined}
    style={{ color: "hsl(var(--foreground))", ...((session || fillHeight) && !showHubShell ? { height: viewport.viewportHeight || "100dvh", minHeight: 0 } : {}) }}
  >
    {showNav && <header className="morning-theme-topbar relative z-30 flex items-center justify-between gap-2 px-4 md:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 shrink-0">
      <Button asChild variant="ghost" size="sm" className="morning-topbar-back -ml-2 h-11 px-2 font-normal text-[15px] gap-0.5 max-w-[42vw] sm:max-w-none">
        <Link to={effectiveBackTo} aria-label={session ? "Exit morning" : backLabel}>
          <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" strokeWidth={2} />
          <span className={session ? "sr-only" : "truncate"}>{backLabel}</span>
        </Link>
      </Button>
      <span className="min-w-0 truncate text-[14px] font-medium">{session ? title : "Morning formula"}</span>
      <div className={cn("flex min-w-[2rem] shrink-0 justify-end", session && "morning-session-tools")} style={session ? timerSurfaceTokens : undefined}>{right}</div>
    </header>}
    <main ref={content} className={cn("morning-theme-scroll relative z-10 flex-1 flex flex-col w-full min-w-0 min-h-0 overflow-y-auto overscroll-contain",
      session && !hasHero && "morning-session-width morning-no-hero")}
    >
      {hasHero ? <>{hero}<div className="morning-session-width morning-session-content">{children}</div></>
        : workspace ? <>
          <MorningPageHero compact title={title} subtitle={subtitle} eyebrow="My foundation" reminder="Build once. Return each morning." />
          <div className="morning-session-width morning-workspace-layout">
            <aside className="morning-workspace-index"><MorningFoundationNav /></aside>
            <div className="morning-workspace-body">{children}</div>
          </div>
          <details className="morning-workspace-mobile-nav morning-session-width"><summary>Explore foundation sections</summary><MorningFoundationNav /></details>
        </> : children}
    </main>
    {session && footer && <footer className="morning-session-footer shrink-0 border-t border-border/40 bg-background text-foreground pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={{ color: "hsl(var(--foreground))" }}>
      <div className="morning-session-width">{footer}</div>
    </footer>}
  </div>;
}
