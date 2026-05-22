import { useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, FileStack, Home, Search, User } from "lucide-react";
import { ARTIFACT_MOBILE_DOCK_H } from "@/lib/framework/artifactLayoutCss";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/home", label: "Home", icon: Home, match: (p: string) => p === "/home" },
  { to: "/my-ai", label: "Search", icon: Search, match: (p: string) => p.startsWith("/my-ai") },
  {
    to: "/framework/artifacts",
    label: "Library",
    icon: FileStack,
    match: (p: string) => p.startsWith("/framework/artifacts"),
  },
  { to: "/framework/study", label: "Study", icon: BookOpen, match: (p: string) => p === "/framework/study" },
  { to: "/settings", label: "Profile", icon: User, match: (p: string) => p === "/settings" },
] as const;

type Props = {
  className?: string;
  layoutRootSelector?: string;
};

export default function MobileAppDock({
  className,
  layoutRootSelector = "[data-artifact-youtube-mobile]",
}: Props) {
  const dockRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const dock = dockRef.current;
    const root = dock?.closest(layoutRootSelector) as HTMLElement | null;
    if (!dock || !root) return;
    const sync = () => {
      const h = dock.getBoundingClientRect().height;
      root.style.setProperty("--artifact-mobile-dock-h", `${Math.max(0, Math.ceil(h))}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(dock);
    root.style.setProperty("--artifact-mobile-dock-h", ARTIFACT_MOBILE_DOCK_H);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--artifact-mobile-dock-h");
    };
  }, [layoutRootSelector]);

  return (
    <nav
      ref={dockRef}
      aria-label="App"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[45] flex justify-center px-4",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-md items-center justify-between gap-0.5",
          "rounded-full border border-border/50 bg-background/95 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
          "backdrop-blur-md supports-[backdrop-filter]:bg-background/85",
        )}
      >
        {ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-[10px] font-medium transition",
                active
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
