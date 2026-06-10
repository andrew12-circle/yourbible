import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, Signal, Wifi, BatteryFull } from "lucide-react";
import { cn } from "@/lib/utils";
import { IosAppIcon } from "@/components/home/IosAppIcon";
import { useMiniPhone } from "@/contexts/MiniPhoneContext";
import { useMiniPhoneSize } from "@/hooks/useMiniPhoneSize";
import { splitMiniPhoneHomePages } from "@/lib/mini-phone/miniPhoneHomePages";
import {
  IOS_DOCK_ICON_PT,
  IOS_GRID_ICON_PT,
  MINI_PHONE_DOCK_LABELS,
  iosScaledPx,
  DEFAULT_MINI_PHONE_WALLPAPER_STYLE,
  iosWallpaperBlurPx,
  miniPhoneRowStride,
} from "@/lib/mini-phone/miniPhoneIosLayout";
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
  iconSize,
  onLaunch,
}: {
  app: HomeAppIcon;
  iconSize: number;
  onLaunch: () => void;
}) {
  const Icon = app.icon;
  const labelSize = Math.max(9, Math.round(iconSize * 0.18));

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
            pixelSize={iconSize}
            className="transition-transform group-active:scale-90"
          />
        )}
        {app.badge !== undefined && app.badge !== "" && (
          <span
            className="absolute -top-1 -right-1 rounded-full bg-[#FF3B30] text-white font-semibold flex items-center justify-center ring-2 ring-white/90 shadow tabular-nums"
            style={{
              minWidth: Math.round(iconSize * 0.36),
              height: Math.round(iconSize * 0.36),
              fontSize: Math.max(8, Math.round(iconSize * 0.2)),
              paddingInline: Math.round(iconSize * 0.08),
            }}
          >
            {typeof app.badge === "number" && app.badge > 99 ? "99+" : app.badge}
          </span>
        )}
      </div>
      <span
        className="font-medium text-white tracking-tight leading-tight text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
        style={{ fontSize: labelSize }}
      >
        {app.label}
      </span>
    </button>
  );
}

function MiniPhoneStatusBar({ time }: { time: string }) {
  return (
    <div className="relative z-20 shrink-0 flex items-center justify-between bg-black px-4 pt-2 pb-1 text-white select-none">
      <span className="text-[11px] font-semibold tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        {time}
      </span>
      <div className="flex items-center gap-1 opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        <Signal className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        <Wifi className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        <BatteryFull className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </div>
    </div>
  );
}

function MiniPhoneSearchPill() {
  return (
    <div className="relative z-10 shrink-0 flex justify-center px-6 pb-2">
      <div
        className="ios-search-pill flex w-full max-w-[9.5rem] items-center justify-center gap-1.5 rounded-full py-1.5 text-white/90"
        role="search"
        aria-label="Search"
      >
        <Search className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.5} aria-hidden />
        <span className="text-[11px] font-medium tracking-tight">Search</span>
      </div>
    </div>
  );
}

function MiniPhoneDock({
  dockApps,
  iconSize,
  onLaunch,
}: {
  dockApps: HomeAppIcon[];
  iconSize: number;
  onLaunch: (app: HomeAppIcon) => void;
}) {
  if (dockApps.length === 0) return null;

  return (
    <div className="relative z-10 shrink-0 px-3 pb-2">
      <div className="ios-dock flex items-center justify-around rounded-[1.35rem] px-2 py-2">
        {dockApps.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.label}
              type="button"
              onClick={() => onLaunch(app)}
              className="group focus:outline-none"
              aria-label={app.ariaLabel ?? app.label}
            >
              {Icon && (
                <IosAppIcon
                  icon={Icon}
                  background={app.color}
                  iconColor={app.iconColor ?? "#FFFFFF"}
                  imageSrc={app.imageSrc}
                  pixelSize={iconSize}
                  size="dock"
                  className="transition-transform group-active:scale-90"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MiniPhoneHomeGrid({ apps, wallpaper, wallpaperTint, wallpaperBlur }: MiniPhoneHomeGridProps) {
  const { openApp } = useMiniPhone();
  const now = useNow();
  const { width } = useMiniPhoneSize();
  const gridAreaRef = useRef<HTMLDivElement>(null);
  const measureGridRef = useRef<HTMLDivElement>(null);
  const pagerRef = useRef<HTMLDivElement>(null);
  const [gridHeightPx, setGridHeightPx] = useState(200);
  const [rowStridePx, setRowStridePx] = useState(() => miniPhoneRowStride(width));
  const [activePage, setActivePage] = useState(0);

  const iconSize = iosScaledPx(width, IOS_GRID_ICON_PT);
  const dockIconSize = iosScaledPx(width, IOS_DOCK_ICON_PT);
  const effectiveBlur = iosWallpaperBlurPx(width, wallpaperBlur);
  const gridGapX = Math.max(8, Math.round((width * 19) / 393));
  const gridGapY = Math.max(12, Math.round((width * 22) / 393));

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const dockApps = useMemo(
    () =>
      MINI_PHONE_DOCK_LABELS.map((label) => apps.find((a) => a.label === label)).filter(
        (a): a is HomeAppIcon => a != null,
      ),
    [apps],
  );

  const gridApps = useMemo(
    () =>
      apps.filter(
        (app) => !MINI_PHONE_DOCK_LABELS.includes(app.label as (typeof MINI_PHONE_DOCK_LABELS)[number]),
      ),
    [apps],
  );

  const pages = useMemo(
    () => splitMiniPhoneHomePages(gridApps.length, gridHeightPx, rowStridePx),
    [gridApps.length, gridHeightPx, rowStridePx],
  );

  useLayoutEffect(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    const measureHeight = () => setGridHeightPx(Math.max(80, el.clientHeight));
    measureHeight();
    const ro = new ResizeObserver(measureHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  useLayoutEffect(() => {
    const measureStride = () => {
      const gridEl = measureGridRef.current;
      if (!gridEl) {
        setRowStridePx(miniPhoneRowStride(width));
        return;
      }
      const first = gridEl.querySelector("button");
      if (!first) {
        setRowStridePx(miniPhoneRowStride(width));
        return;
      }
      const style = getComputedStyle(gridEl);
      const gapY = parseFloat(style.rowGap) || gridGapY;
      const cellH = first.getBoundingClientRect().height;
      setRowStridePx(cellH > 0 ? cellH + gapY : miniPhoneRowStride(width));
    };

    measureStride();
    const ro = new ResizeObserver(measureStride);
    if (measureGridRef.current) ro.observe(measureGridRef.current);
    return () => ro.disconnect();
  }, [width, gridGapY, gridApps.length, iconSize]);

  useEffect(() => {
    if (activePage >= pages.length) {
      setActivePage(0);
      if (pagerRef.current) pagerRef.current.scrollLeft = 0;
    }
  }, [pages.length, activePage]);

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

  const wallpaperLayerStyle = wallpaper
    ? {
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
        backgroundAttachment: "scroll" as const,
      }
    : undefined;

  return (
    <div className="relative isolate flex h-full w-full flex-col overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black" aria-hidden />
        {wallpaper ? (
          <div
            className="mini-phone-wallpaper absolute inset-0"
            style={
              effectiveBlur > 0
                ? { ...wallpaperLayerStyle, filter: `blur(${effectiveBlur}px) saturate(120%)` }
                : wallpaperLayerStyle
            }
          />
        ) : (
          <div
            className="mini-phone-wallpaper absolute inset-0"
            style={DEFAULT_MINI_PHONE_WALLPAPER_STYLE}
          />
        )}
        <div
          className="absolute inset-x-0 top-0 h-14 bg-black"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/30" />
        <div
          className="absolute inset-0"
          style={{ background: `rgba(17, 24, 39, ${wallpaperTint / 100})` }}
        />
      </div>

      <MiniPhoneStatusBar time={time} />

      <div ref={gridAreaRef} className="relative z-10 flex-1 min-h-0 px-3 overflow-hidden">
        <div
          ref={pagerRef}
          onScroll={onPagerScroll}
          className="flex h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide touch-pan-x"
          style={{ scrollSnapType: "x mandatory", overscrollBehaviorX: "contain" }}
        >
          {pages.map((indexes, pageIdx) => (
            <div
              key={pageIdx}
              className="flex-[0_0_100%] h-full shrink-0 snap-start overflow-hidden box-border"
            >
              <div
                ref={pageIdx === 0 ? measureGridRef : undefined}
                className="grid grid-cols-4 content-start"
                style={{ columnGap: gridGapX, rowGap: gridGapY }}
              >
                {indexes.map((i) => (
                  <MiniPhoneAppTile
                    key={gridApps[i].label}
                    app={gridApps[i]}
                    iconSize={iconSize}
                    onLaunch={() => launchApp(gridApps[i])}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="relative z-10 shrink-0 flex items-center justify-center gap-1.5 py-1">
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

      <MiniPhoneSearchPill />
      <MiniPhoneDock dockApps={dockApps} iconSize={dockIconSize} onLaunch={launchApp} />
    </div>
  );
}
