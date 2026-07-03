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
};

export default function PrayerShell({ children, title, back = "/prayer", hideTabs = false }: Props) {
  const { pathname } = useLocation();
  const { showHubShell } = useAppShellMode();

  return (
    <div className={cn(hubShellPageRoot(showHubShell), "flex min-h-0 flex-1 flex-col")}>
      <header className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
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
          <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
            {TABS.map((tab) => {
              const active = tab.end
                ? pathname === tab.to
                : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition",
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
      <main className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-4 py-5 pb-safe-28">
        {children}
      </main>
    </div>
  );
}
