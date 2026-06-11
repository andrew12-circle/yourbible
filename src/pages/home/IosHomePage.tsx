import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { readSafeAreaInsetBottom } from "@/lib/deviceSafeArea";
import { LifeWeeksTile } from "@/components/home/LifeWeeksTile";
import { LifePrioritiesPanel } from "@/components/home/LifePrioritiesPanel";
import { BibleHomeWidgets } from "@/components/home/BibleHomeWidgets";
import { HomeFloatingTabBar } from "@/components/home/HomeFloatingTabBar";
import { HomeJournalCards } from "@/components/home/HomeJournalCards";
import { MorningFormulaHomeCard } from "@/components/home/MorningFormulaHomeCard";
import { HomeAppButton } from "@/components/home/HomeAppButton";
import { useHomeDashboardData } from "@/hooks/useHomeDashboardData";
import { getBibleRoute } from "@/lib/home/homeApps";
import {
  IOS_GRID_ICON_PT,
  iosHomeGridGapX,
  iosHomeGridGapY,
  iosHomeRowStride,
  iosScaledPx,
} from "@/lib/home/iosHomeLayout";
import { readIsCompactViewport } from "@/lib/shell/viewport";
import { cn } from "@/lib/utils";
import type { HomeAppIcon } from "@/lib/home/homeApps";

type PageDef = { type: "apps"; indexes: number[] } | { type: "widgets" };

function homePagesEqual(a: PageDef[], b: PageDef[]) {
  if (a.length !== b.length) return false;
  return a.every((p, i) => {
    const q = b[i];
    if (p.type !== q.type) return false;
    if (p.type === "widgets" && q.type === "widgets") return true;
    if (p.type === "apps" && q.type === "apps") {
      return p.indexes.length === q.indexes.length && p.indexes.every((n, j) => n === q.indexes[j]);
    }
    return false;
  });
}

const HOME_BOTTOM_CHROME_PX = 92;

export default function IosHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    todayPrompt,
    onThisDayCount,
    apps,
    wallpaper,
    wallpaperTint,
    wallpaperBlur,
    profilePhoto,
    displayName,
  } = useHomeDashboardData();

  const [now, setNow] = useState<Date>(new Date());
  const widgetsRef = useRef<HTMLDivElement>(null);
  const weeksStripRef = useRef<HTMLDivElement>(null);
  const pagerRef = useRef<HTMLDivElement>(null);
  const gridMeasureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PageDef[]>([
    { type: "apps", indexes: [] },
    { type: "widgets" },
  ]);
  const [pageHeightPx, setPageHeightPx] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [isCompact, setIsCompact] = useState(readIsCompactViewport);
  const [gridWidthPx, setGridWidthPx] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 393,
  );

  useEffect(() => {
    const syncViewport = () => setIsCompact(readIsCompactViewport());
    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const appCount = apps.length;

  useLayoutEffect(() => {
    const gridColsForWidth = (w: number) => (w < 640 ? 4 : w < 768 ? 5 : 6);

    const measureGrid = (gridEl: HTMLDivElement | null, w: number) => {
      const cols = gridColsForWidth(w);
      const fallbackRow = isCompact ? iosHomeRowStride(w) : w < 640 ? 90 : 103;
      if (!gridEl) return { cols, rowStride: fallbackRow };
      const first = gridEl.querySelector("button");
      if (!first) return { cols, rowStride: fallbackRow };
      const style = getComputedStyle(gridEl);
      const gapY =
        parseFloat(style.rowGap) ||
        parseFloat(style.gap) ||
        (isCompact ? iosHomeGridGapY(w) : w < 640 ? 20 : 24);
      const cellH = first.getBoundingClientRect().height;
      return { cols, rowStride: cellH > 0 ? cellH + gapY : fallbackRow };
    };

    const calc = () => {
      const w = window.innerWidth;
      const gridW = gridMeasureRef.current?.clientWidth ?? w;
      setGridWidthPx(gridW);
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const pagerTop = pagerRef.current?.getBoundingClientRect().top ?? 0;
      const availH = Math.max(160, vh - pagerTop - HOME_BOTTOM_CHROME_PX - readSafeAreaInsetBottom());
      setPageHeightPx(Math.floor(availH));

      const { cols, rowStride } = measureGrid(gridMeasureRef.current, w);
      const weeksH = weeksStripRef.current?.offsetHeight ?? 0;
      const weeksGap = weeksH > 0 ? 12 : 0;
      const availFirst = Math.max(rowStride, availH - weeksH - weeksGap);
      const rowsFirst = Math.max(1, Math.floor(availFirst / rowStride));
      const rowsPerPage = Math.max(1, Math.floor(availH / rowStride));
      const firstPerPage = Math.min(appCount, rowsFirst * cols);
      const perPage = rowsPerPage * cols;

      const indices: number[] = Array.from({ length: appCount }, (_, i) => i);
      const result: PageDef[] = [];
      result.push({ type: "apps", indexes: indices.slice(0, firstPerPage) });
      result.push({ type: "widgets" });
      let i = firstPerPage;
      while (i < appCount) {
        result.push({ type: "apps", indexes: indices.slice(i, i + perPage) });
        i += perPage;
      }
      setPages((prev) => (homePagesEqual(prev, result) ? prev : result));
    };

    calc();
    const raf = requestAnimationFrame(calc);
    const ro = new ResizeObserver(calc);
    if (weeksStripRef.current) ro.observe(weeksStripRef.current);
    if (gridMeasureRef.current) ro.observe(gridMeasureRef.current);
    if (pagerRef.current) ro.observe(pagerRef.current);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", calc);
    vv?.addEventListener("scroll", calc);
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", calc);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      vv?.removeEventListener("resize", calc);
      vv?.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", calc);
    };
  }, [appCount, isCompact]);

  useEffect(() => {
    if (activePage >= pages.length && pages.length > 0) {
      setActivePage(0);
      if (pagerRef.current) pagerRef.current.scrollLeft = 0;
    }
  }, [pages.length, activePage]);

  const onPagerScroll = () => {
    if (!pagerRef.current) return;
    const w = pagerRef.current.clientWidth;
    if (w <= 0) return;
    const idx = Math.round(pagerRef.current.scrollLeft / w);
    if (idx !== activePage) setActivePage(idx);
  };

  const goToPage = (i: number) => {
    if (!pagerRef.current) return;
    pagerRef.current.scrollTo({ left: i * pagerRef.current.clientWidth, behavior: "smooth" });
  };

  const pageCount = Math.max(1, pages.length);
  const bibleTo = getBibleRoute();
  const gridIconSize = isCompact ? iosScaledPx(gridWidthPx, IOS_GRID_ICON_PT) : undefined;
  const gridGapStyle = isCompact
    ? { columnGap: iosHomeGridGapX(gridWidthPx), rowGap: iosHomeGridGapY(gridWidthPx) }
    : undefined;

  const greeting = (() => {
    const h = now.getHours();
    if (h < 5) return "Peace tonight";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "");
  const dateStr = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const fullDateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const profileInitial = (displayName || user?.email || "U").trim()[0]?.toUpperCase() ?? "U";

  const wallpaperStyle = wallpaper
    ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "scroll" as const }
    : undefined;

  const openApp = (app: HomeAppIcon) => {
    if (app.onOpen) app.onOpen();
    else if (app.to) navigate(app.to);
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${wallpaper ? "" : "ios-wallpaper"}`}
      style={wallpaperStyle}
    >
      {wallpaper && <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />}
      {wallpaper && (
        <>
          <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: `blur(${wallpaperBlur}px)` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(17, 24, 39, ${wallpaperTint / 100})` }} />
        </>
      )}

      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        <div className="flex items-baseline gap-2 text-[15px] font-semibold tracking-tight tabular-nums">
          <span>{timeStr}</span>
          <span className="text-[12px] font-medium opacity-90">{dateStr}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="w-10 h-10 rounded-full bg-white/25 border border-white/45 backdrop-blur-xl overflow-hidden flex items-center justify-center text-white font-semibold shadow-[0_8px_22px_-12px_rgba(0,0,0,0.6)] active:scale-95 transition"
          aria-label="Open profile and settings"
        >
          {profilePhoto ? (
            <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center">
              {profileInitial || <User className="w-4 h-4" />}
            </span>
          )}
        </button>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto pt-2 pb-[calc(10rem+var(--safe-area-inset-bottom))] sm:pb-[calc(8rem+var(--safe-area-inset-bottom))]">
        <div className="text-center mt-2 mb-3 sm:mb-4 px-4 sm:px-6">
          <p className="text-[13px] font-medium text-white/85 tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{fullDateStr}</p>
          <h1 className="mt-0.5 text-[28px] sm:text-[34px] leading-[1.05] font-bold tracking-[-0.022em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {greeting}{displayName ? `, ${displayName}` : ""}
          </h1>
        </div>

        <div
          ref={pagerRef}
          onScroll={onPagerScroll}
          className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide touch-pan-x"
          style={{
            scrollSnapType: "x mandatory",
            overscrollBehaviorX: "contain",
            height: pageHeightPx ?? undefined,
          }}
        >
          {pages.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className="w-full shrink-0 snap-start px-4 sm:px-6 overflow-hidden"
              style={{ height: pageHeightPx ?? undefined }}
            >
              {page.type === "widgets" ? (
                <div ref={widgetsRef}>
                  <MorningFormulaHomeCard />
                  <BibleHomeWidgets />
                  <LifePrioritiesPanel />
                  <HomeJournalCards
                    todayPrompt={todayPrompt}
                    onThisDayCount={onThisDayCount}
                    variant="ios"
                  />
                </div>
              ) : (
                <>
                  {pageIdx === 0 && (
                    <div ref={weeksStripRef} className="[&_button]:mb-3">
                      <LifeWeeksTile />
                    </div>
                  )}
                  <div
                    ref={pageIdx === 0 ? gridMeasureRef : undefined}
                    className={cn(
                      "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6",
                      !isCompact && "gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6",
                    )}
                    style={gridGapStyle}
                  >
                    {page.indexes.map((i) => (
                      <HomeAppButton
                        key={apps[i].label}
                        app={apps[i]}
                        iconSize={gridIconSize}
                        onClick={() => openApp(apps[i])}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-0 right-0 flex items-center justify-center gap-1.5 z-10">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToPage(i)}
              aria-label={`Page ${i + 1} of ${pageCount}`}
              aria-current={i === activePage ? "page" : undefined}
              className={`rounded-full transition-all ${
                i === activePage
                  ? "w-2 h-2 bg-white/95 shadow"
                  : "w-1.5 h-1.5 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>

        <HomeFloatingTabBar bibleTo={bibleTo} onHome={() => goToPage(0)} />
      </div>
    </div>
  );
}
