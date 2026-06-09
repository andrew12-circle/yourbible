import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IosAppIcon } from "@/components/home/IosAppIcon";
import { useMiniPhone } from "@/contexts/MiniPhoneContext";
import { useMiniPhoneSize } from "@/hooks/useMiniPhoneSize";
import { splitMiniPhoneHomePages } from "@/lib/mini-phone/miniPhoneHomePages";
import type { HomeAppIcon } from "@/lib/home/homeApps";

interface MiniPhoneHomeGridProps {
  apps: HomeAppIcon[];
  wallpaper: string | null;
  wallpaperTint: number;
  wallpaperBlur: number;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function MiniPhoneAppTile({
  app,
  compact,
  onLaunch,
}: {
  app: HomeAppIcon;
  compact: boolean;
  onLaunch: () => void;
}) {
  const Icon = app.icon;
  return (
    <button
      type="button"
      onClick={onLaunch}
      className="group flex flex-col items-center gap-1 focus:outline-none"
      aria-label={app.ariaLabel ?? app.label}
    >
      <div className="relative">
        {Icon && (
          <IosAppIcon
            icon={Icon}
            background={app.color}
            iconColor={app.iconColor ?? "#FFFFFF"}
            imageSrc={app.imageSrc}
            className={cn(
              "transition-transform group-active:scale-90",
              compact ? "!w-11 !h-11" : "!w-[52px] !h-[52px]",
            )}
          />
        )}
        {app.badge !== undefined && app.badge !== "" && (
          <span
            className={cn(
              "absolute -top-1 -right-1 rounded-full bg-[#FF3B30] text-white font-semibold flex items-center justify-center ring-2 ring-white/90 shadow tabular-nums",
              compact ? "min-w-[16px] h-[16px] px-1 text-[9px]" : "min-w-[20px] h-[20px] px-1.5 text-[11px]",
            )}
          >
            {typeof app.badge === "number" && app.badge > 99 ? "99+" : app.badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "font-medium text-white tracking-tight leading-tight text-center drop-shadow-md",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        {app.label}
      </span>
    </button>
  );
}

export function MiniPhoneHomeGrid({ apps, wallpaper, wallpaperTint, wallpaperBlur }: MiniPhoneHomeGridProps) {
  const { openApp } = useMiniPhone();
  const now = useNow();
  const { compact, height } = useMiniPhoneSize();
  const gridAreaRef = useRef<HTMLDivElement>(null);
  const pagerRef = useRef<HTMLDivElement>(null);
  const [gridHeightPx, setGridHeightPx] = useState(200);
  const [activePage, setActivePage] = useState(0);

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const pages = useMemo(
    () => splitMiniPhoneHomePages(apps.length, gridHeightPx, compact),
    [apps.length, gridHeightPx, compact],
  );

  useLayoutEffect(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    const measure = () => setGridHeightPx(Math.max(80, el.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    if (activePage >= pages.length) {
      setActivePage(0);
      if (pagerRef.current) pagerRef.current.scrollLeft = 0;
    }
  }, [pages.length, activePage]);

  const bgStyle = wallpaper
    ? {
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
      }
    : undefined;

  const launchApp = (app: HomeAppIcon) => {
    if (app.label === "YouTube") {
      openApp("/phone/youtube");
      return;
    }
    if (app.to) openApp(app.to);
  };

  const onPagerScroll = () => {
    const pager = pagerRef.current;
    if (!pager || pager.clientWidth <= 0) return;
    const idx = Math.round(pager.scrollLeft / pager.clientWidth);
    if (idx !== activePage) setActivePage(idx);
  };

  const goToPage = (i: number) => {
    const pager = pagerRef.current;
    if (!pager) return;
    pager.scrollTo({ left: i * pager.clientWidth, behavior: "smooth" });
  };

  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden flex flex-col relative",
        wallpaper ? "" : "ios-wallpaper",
        compact ? "px-2.5 pt-6 pb-2" : "px-4 pt-8 pb-2",
      )}
      style={bgStyle}
    >
      {wallpaper && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backdropFilter: `blur(${wallpaperBlur}px)` }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `rgba(17, 24, 39, ${wallpaperTint / 100})` }}
          />
        </>
      )}

      <div
        className={cn(
          "relative z-10 shrink-0 text-center text-white select-none drop-shadow-lg",
          compact ? "mt-2" : "mt-4",
        )}
      >
        <div className={compact ? "text-[10px] font-medium opacity-90" : "text-xs font-medium opacity-90"}>
          {date}
        </div>
        <div
          className={cn(
            "font-light tracking-tight leading-none mt-1 tabular-nums",
            compact ? "text-4xl" : "text-5xl",
          )}
        >
          {time}
        </div>
      </div>

      <div ref={gridAreaRef} className="relative z-10 flex-1 min-h-0 mt-4">
        <div
          ref={pagerRef}
          onScroll={onPagerScroll}
          className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide touch-pan-x"
          style={{ scrollSnapType: "x mandatory", overscrollBehaviorX: "contain" }}
        >
          {pages.map((indexes, pageIdx) => (
            <div
              key={pageIdx}
              className={cn(
                "w-full h-full shrink-0 snap-start overflow-hidden",
                compact ? "px-0.5" : "px-0",
              )}
            >
              <div
                className={cn(
                  "grid grid-cols-4",
                  compact ? "gap-x-2 gap-y-3" : "gap-x-3 gap-y-4",
                )}
              >
                {indexes.map((i) => (
                  <MiniPhoneAppTile
                    key={apps[i].label}
                    app={apps[i]}
                    compact={compact}
                    onLaunch={() => launchApp(apps[i])}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="relative z-10 shrink-0 flex items-center justify-center gap-1.5 py-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToPage(i)}
              aria-label={`App page ${i + 1} of ${pages.length}`}
              aria-current={i === activePage ? "page" : undefined}
              className={cn(
                "rounded-full transition-all",
                i === activePage
                  ? "w-2 h-2 bg-white/95 shadow"
                  : "w-1.5 h-1.5 bg-white/45 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
