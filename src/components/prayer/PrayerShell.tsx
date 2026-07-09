import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { hubShellPageRoot } from "@/lib/shell/hubShellClasses";
import { useAppShellMode } from "@/hooks/useAppShellMode";

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
  const contentWidth = wide ? "max-w-none" : "max-w-3xl";
  const contentPad = wide ? "px-4 lg:px-6" : "px-4";

  return (
    <div className={cn(hubShellPageRoot(showHubShell), "flex min-h-0 flex-1 flex-col")}>
      <header className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className={cn("mx-auto flex w-full items-center gap-3 py-3", contentWidth, contentPad)}>
          <Link
            to={back}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title ?? "Prayer"}</h1>
          </div>
        </div>
        {!hideTabs ? (
          <nav className={cn("mx-auto grid w-full grid-cols-4 gap-1 pb-2", contentWidth, contentPad)}>
            {TABS.map((tab) => {
              const active = tab.end
                ? pathname === tab.to
                : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
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
