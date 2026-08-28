import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { hubShellPageRoot } from "@/lib/shell/hubShellClasses";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TABS = [
  { to: "/prayer", label: "Overview", end: true },
  { to: "/prayer/requests", label: "Requests", end: false },
  { to: "/prayer/praise", label: "Praise", end: false },
  { to: "/prayer/timeline", label: "Timeline", end: false },
] as const;

type Props = {
  children: React.ReactNode;
  title?: string;
  back?: string;
  hideTabs?: boolean;
  /** Full-width layout for ledger / table views (default is narrow reading width). */
  wide?: boolean;
};

export default function PrayerShell({
  children,
  title,
  back = "/prayer",
  hideTabs = false,
  wide = false,
}: Props) {
  const { pathname } = useLocation();
  const { showHubShell } = useAppShellMode();
  const isMobile = useIsMobile();
  const isRoot = pathname === "/prayer";
  const contentWidth = wide ? "max-w-none" : "max-w-3xl";
  const contentPad = wide
    ? "pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]"
    : "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]";

  return (
    <div
      className={cn(
        hubShellPageRoot(
          showHubShell,
          "h-[100dvh] min-h-[100dvh] overflow-hidden bg-background",
        ),
        "flex min-h-0 flex-1 flex-col",
      )}
    >
      <header
        className={cn(
          "shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-sm",
          !showHubShell
            ? "pt-[var(--safe-area-inset-top)]"
            : isMobile && "pt-[max(0.5rem,var(--safe-area-inset-top))]",
        )}
      >
        <div className={cn("mx-auto flex w-full items-center gap-3 py-3", contentWidth, contentPad)}>
          {isRoot ? (
            showHubShell ? (
              <SidebarTrigger className="h-11 w-11 shrink-0" aria-label="Open navigation" />
            ) : (
              <Link
                to="/home"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Back home"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )
          ) : (
            <Link
              to={back}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Back to prayer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-sans text-lg font-semibold tracking-tight">{title ?? "Prayer"}</h1>
          </div>
        </div>
        {!hideTabs ? (
          <div className={cn("mx-auto w-full pb-2", contentWidth, contentPad)}>
            <nav
              aria-label="Prayer sections"
              className="grid grid-cols-4 rounded-xl bg-muted/70 p-1"
            >
              {TABS.map((tab) => {
                const active = tab.end
                  ? pathname === tab.to
                  : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={cn(
                      "inline-flex min-h-11 min-w-0 items-center justify-center rounded-lg px-1.5 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm",
                      active
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </header>
      <main
        className={cn(
          "mx-auto min-h-0 w-full flex-1 overflow-y-auto py-5 pb-safe-28",
          "bg-[radial-gradient(ellipse_at_top,hsl(var(--paper-warm)/0.35)_0%,transparent_55%)]",
          contentWidth,
          contentPad,
          wide && "overflow-x-hidden",
        )}
      >
        {children}
      </main>
    </div>
  );
}
