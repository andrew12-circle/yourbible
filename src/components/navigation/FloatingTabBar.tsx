import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FloatingTabItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
};

type FloatingTabBarProps = {
  items: FloatingTabItem[];
  /** `wallpaper` — frosted glass over the home-screen gradient; `surface` — app chrome. */
  tone?: "wallpaper" | "surface";
  className?: string;
  /** When set, syncs dock height on the nearest matching ancestor. */
  layoutRootSelector?: string;
  layoutHeightVar?: string;
  layoutHeightFallbackPx?: number;
};

export function FloatingTabItemButton({
  label,
  icon: Icon,
  active = false,
  onClick,
  tone = "surface",
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  tone?: "wallpaper" | "surface";
}) {
  const onWallpaper = tone === "wallpaper";
  const wallpaperInactive = onWallpaper && !active;

  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1.5 py-1.5 text-[10px] font-medium leading-none transition-colors",
        active
          ? onWallpaper
            ? "bg-white text-zinc-900 shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
            : "bg-muted text-foreground shadow-sm"
          : onWallpaper
            ? "text-white hover:bg-white/15"
            : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-[22px] w-[22px] shrink-0",
          wallpaperInactive && "drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]",
        )}
        strokeWidth={wallpaperInactive ? 2.1 : 1.85}
        aria-hidden
      />
      <span
        className={cn(
          "truncate max-w-[4.5rem]",
          wallpaperInactive && "drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function FloatingTabBarShell({
  children,
  tone = "surface",
  className,
}: {
  children: ReactNode;
  tone?: "wallpaper" | "surface";
  className?: string;
}) {
  const onWallpaper = tone === "wallpaper";

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-[min(100%,26rem)] items-center justify-between gap-0.5",
        "rounded-full px-1.5 py-1.5",
        onWallpaper
          ? "border border-white/50 bg-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/22"
          : "border border-border/50 bg-background/95 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function FloatingTabBar({
  items,
  tone = "surface",
  className,
  layoutRootSelector,
  layoutHeightVar = "--floating-tab-bar-h",
  layoutHeightFallbackPx,
}: FloatingTabBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!layoutRootSelector) return;
    const bar = barRef.current;
    const root = bar?.closest(layoutRootSelector) as HTMLElement | null;
    if (!bar || !root) return;

    const sync = () => {
      const h = bar.getBoundingClientRect().height;
      root.style.setProperty(layoutHeightVar, `${Math.max(0, Math.ceil(h))}px`);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(bar);
    if (layoutHeightFallbackPx != null) {
      root.style.setProperty(layoutHeightVar, `${layoutHeightFallbackPx}px`);
    }
    return () => {
      ro.disconnect();
      root.style.removeProperty(layoutHeightVar);
    };
  }, [layoutRootSelector, layoutHeightVar, layoutHeightFallbackPx]);

  return (
    <>
      {tone === "wallpaper" ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[44] h-32 bg-gradient-to-t from-black/35 via-black/14 to-transparent"
          aria-hidden
        />
      ) : null}
      <nav
      ref={barRef}
      aria-label="App"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[45] flex justify-center px-4",
        "pointer-events-none pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2",
        className,
      )}
    >
      <FloatingTabBarShell tone={tone}>
        {items.map((item) => (
          <FloatingTabItemButton
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={item.active}
            onClick={item.onClick}
            tone={tone}
          />
        ))}
      </FloatingTabBarShell>
    </nav>
    </>
  );
}
