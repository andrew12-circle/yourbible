import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, BookOpen, ListTodo, CheckSquare, MessageCircleHeart,
  Sun, GraduationCap, Sparkles, Mail, Moon, Settings, NotebookPen, Brain,
  Lightbulb, Calendar as CalIcon, User, Youtube, HeartHandshake,
  Sprout, ClipboardList, FileStack, Clock, Share2, Network, Users,
  type LucideIcon,
} from "lucide-react";
import { HOME_PROFILE_PHOTO_STORAGE_KEY } from "@/lib/homeProfilePhoto";
import { parseHomeLayoutMedia, resolveHomeMediaUrl } from "@/lib/profile/homeMedia";
import { readSafeAreaInsetBottom } from "@/lib/deviceSafeArea";
import { LifeWeeksTile } from "@/components/home/LifeWeeksTile";
import { LifePrioritiesPanel } from "@/components/home/LifePrioritiesPanel";
import { BibleHomeWidgets } from "@/components/home/BibleHomeWidgets";
import { IosAppIcon } from "@/components/home/IosAppIcon";
import { HomeFloatingTabBar } from "@/components/home/HomeFloatingTabBar";
import { IOS_APP_BG } from "@/lib/home/iosAppPalette";
const LAST_READ_KEY = "yb_last_read";
const WALLPAPER_KEY = "yb_home_wallpaper"; // data URL

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

type AppIcon = {
  label: string;
  /** In-app route; omit when `onOpen` handles navigation externally. */
  to?: string;
  /** External / special open handler (e.g. deep link). */
  onOpen?: () => void;
  icon?: LucideIcon;
  imageSrc?: string;
  /** Rich icon background for a more native app-tile look. */
  color: string;
  iconColor?: string;
  badge?: string | number;
  /** Overrides default `aria-label` (label). */
  ariaLabel?: string;
};

/** Prefer native YouTube app on mobile; otherwise open youtube.com in a new tab. */
function openYouTubeAppOrWeb() {
  if (typeof window === "undefined") return;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  if (!isIOS && !isAndroid) {
    window.open("https://www.youtube.com", "_blank", "noopener,noreferrer");
    return;
  }

  const scheme = isAndroid ? "vnd.youtube://" : "youtube://";
  window.location.href = scheme;
  window.setTimeout(() => {
    if (document.visibilityState === "visible") {
      window.open("https://www.youtube.com", "_blank", "noopener");
    }
  }, 600);
}

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [todayPrompt, setTodayPrompt] = useState<{ id: string; text: string } | null>(null);
  const [onThisDayCount, setOnThisDayCount] = useState(0);
  const [counts, setCounts] = useState<{ beliefs: number; tensions: number; chats: number; artifacts: number; journalToday: number }>({
    beliefs: 0, tensions: 0, chats: 0, artifacts: 0, journalToday: 0,
  });
  const [wallpaper, setWallpaper] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(WALLPAPER_KEY) : null,
  );
  const [wallpaperTint, setWallpaperTint] = useState(24);
  const [wallpaperBlur, setWallpaperBlur] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(HOME_PROFILE_PHOTO_STORAGE_KEY) : null,
  );
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

  /** Clearance above floating tab bar + page dots (px from viewport bottom). */
  const HOME_BOTTOM_CHROME_PX = 92;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!profile?.layout) return;
    const parsed = parseHomeLayoutMedia(profile.layout);
    if (typeof parsed.homeWallpaperTint === "number") setWallpaperTint(parsed.homeWallpaperTint);
    if (typeof parsed.homeWallpaperBlur === "number") setWallpaperBlur(parsed.homeWallpaperBlur);

    let cancelled = false;
    (async () => {
      const [wp, photo] = await Promise.all([
        resolveHomeMediaUrl(parsed.homeWallpaper),
        resolveHomeMediaUrl(parsed.homeProfilePhoto),
      ]);
      if (cancelled) return;
      if (wp) {
        setWallpaper(wp);
        try {
          localStorage.setItem(WALLPAPER_KEY, wp);
        } catch {
          // Quota — signed URL still works for this session.
        }
      }
      if (photo) {
        setProfilePhoto(photo);
        try {
          localStorage.setItem(HOME_PROFILE_PHOTO_STORAGE_KEY, photo);
        } catch {
          // Quota — signed URL still works for this session.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.layout]);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    const startOfDay = new Date(today); startOfDay.setHours(0,0,0,0);
    (async () => {
      const [{ data: prompts }, { data: past }, { data: beliefs }, { data: tensions }, { data: chats }, { data: arts }, { data: jToday }] = await Promise.all([
        supabase.from("journal_prompts").select("id,text").limit(500),
        supabase
          .from("journal_entries")
          .select("entry_at_ts")
          .or("entry_kind.is.null,entry_kind.neq.vent")
          .lt("entry_at_ts", startOfDay.toISOString())
          .order("entry_at_ts", { ascending: false })
          .limit(500),
        supabase.from("belief_nodes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("belief_tensions" as never).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("chat_threads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("artifacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .or("entry_kind.is.null,entry_kind.neq.vent")
          .gte("entry_at_ts", startOfDay.toISOString()),
      ]);
      const list = prompts ?? [];
      if (list.length) {
        const seed = today.getFullYear()*1000 + Math.floor((today.getTime()-new Date(today.getFullYear(),0,0).getTime())/86400000);
        const p = list[seed % list.length];
        setTodayPrompt({ id: p.id as string, text: p.text as string });
      }
      const m = today.getMonth(), d = today.getDate();
      setOnThisDayCount((past ?? []).filter((e: { entry_at_ts: string }) => {
        const dt = new Date(e.entry_at_ts);
        return dt.getMonth() === m && dt.getDate() === d;
      }).length);
      setCounts({
        beliefs: (beliefs as unknown as { count?: number })?.count ?? 0,
        tensions: (tensions as unknown as { count?: number })?.count ?? 0,
        chats: (chats as unknown as { count?: number })?.count ?? 0,
        artifacts: (arts as unknown as { count?: number })?.count ?? 0,
        journalToday: (jToday as unknown as { count?: number })?.count ?? 0,
      });
    })();
  }, [user]);

  const lastRead = typeof window !== "undefined" ? localStorage.getItem(LAST_READ_KEY) : null;
  const bibleTo = lastRead ? `/read/${lastRead}` : "/read/Jhn/1";
  const promptBadge = !counts.journalToday ? 1 : undefined;

  const apps: AppIcon[] = [
    { label: "Bible",     to: bibleTo,                 icon: BookOpen,              color: IOS_APP_BG.bible, badge: lastRead?.replace("/", " ") },
    { label: "Daily",     to: "/framework/daily",      icon: Sun,                   color: IOS_APP_BG.daily },
    { label: "Framework", to: "/framework",            icon: Brain,                 color: IOS_APP_BG.framework },
    { label: "Journey",   to: "/framework/journey",    icon: Sprout,                color: IOS_APP_BG.journey },
    { label: "Playbook",  to: "/framework/playbook",   icon: ClipboardList,         color: IOS_APP_BG.playbook },
    { label: "Artifacts", to: "/framework/artifacts",  icon: FileStack,             color: IOS_APP_BG.artifacts, badge: counts.artifacts || undefined },
    { label: "Research later", to: "/framework/research-later", icon: Clock,          color: IOS_APP_BG.research, ariaLabel: "Research later" },
    { label: "Graph",     to: "/framework/graph",      icon: Share2,                color: IOS_APP_BG.graph },
    { label: "Beliefs",   to: "/framework/beliefs",    icon: Network,               color: IOS_APP_BG.beliefs, badge: counts.beliefs || undefined },
    { label: "Influences", to: "/framework/influences", icon: Users,                color: IOS_APP_BG.influences },
    { label: "Journal",   to: "/journal",              icon: NotebookPen,           color: IOS_APP_BG.journal, badge: promptBadge },
    {
      label: "Walking together",
      to: "/partner",
      icon: HeartHandshake,
      color: IOS_APP_BG.partner,
      ariaLabel: "Walking together with a partner",
    },
    { label: "Tensions",  to: "/framework/tensions",   icon: Sparkles,              color: IOS_APP_BG.tensions, badge: counts.tensions || undefined },
    { label: "Study",     to: "/framework/study",      icon: GraduationCap,         color: IOS_APP_BG.study },
    { label: "Digest",    to: "/framework/digest",     icon: Mail,                  color: IOS_APP_BG.digest },
    { label: "Tasks",     to: "/life/todos",           icon: ListTodo,              color: IOS_APP_BG.tasks },
    { label: "Habits",    to: "/life/habits",          icon: CheckSquare,           color: IOS_APP_BG.habits },
    { label: "Sleep",     to: "/sleep",                icon: Moon,                  color: IOS_APP_BG.sleep },
    { label: "YouTube",   onOpen: openYouTubeAppOrWeb, icon: Youtube,               color: IOS_APP_BG.youtube, ariaLabel: "Open YouTube" },
    {
      label: "My AI",
      to: "/my-ai",
      icon: MessageCircleHeart,
      color: IOS_APP_BG.myAi,
      ariaLabel: "Open My AI — framework-grounded chat",
      badge: counts.chats || undefined,
    },
    { label: "Settings",  to: "/settings",             icon: Settings,              color: IOS_APP_BG.settings },
  ];

  const appCount = apps.length;

  useLayoutEffect(() => {
    const gridColsForWidth = (w: number) => (w < 640 ? 4 : w < 768 ? 5 : 6);

    const measureGrid = (gridEl: HTMLDivElement | null, w: number) => {
      const cols = gridColsForWidth(w);
      const fallbackRow = w < 640 ? 90 : 103;
      if (!gridEl) return { cols, rowStride: fallbackRow };
      const first = gridEl.querySelector("button");
      if (!first) return { cols, rowStride: fallbackRow };
      const style = getComputedStyle(gridEl);
      const gapY = parseFloat(style.rowGap) || parseFloat(style.gap) || (w < 640 ? 20 : 24);
      const cellH = first.getBoundingClientRect().height;
      return { cols, rowStride: cellH > 0 ? cellH + gapY : fallbackRow };
    };

    const calc = () => {
      const w = window.innerWidth;
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
  }, [appCount]);

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;

  const greeting = (() => {
    const h = now.getHours();
    if (h < 5) return "Peace tonight";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const name = (profile as { display_name?: string; full_name?: string } | null)?.display_name
    ?? (profile as { full_name?: string } | null)?.full_name
    ?? user.email?.split("@")[0] ?? "";

  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "");
  const dateStr = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const fullDateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const profileInitial = (name || user.email || "U").trim()[0]?.toUpperCase() ?? "U";

  const wallpaperStyle = wallpaper
    ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "scroll" as const }
    : undefined;

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${wallpaper ? "" : "ios-wallpaper"}`}
      style={wallpaperStyle}
    >
      {/* Subtle dark overlay for legibility on photo wallpaper */}
      {wallpaper && <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />}
      {wallpaper && (
        <>
          <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: `blur(${wallpaperBlur}px)` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(17, 24, 39, ${wallpaperTint / 100})` }} />
        </>
      )}

      {/* iOS status bar */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        <div className="flex items-baseline gap-2 text-[15px] font-semibold tracking-tight tabular-nums">
          <span>{timeStr}</span>
          <span className="text-[12px] font-medium opacity-90">{dateStr}</span>
        </div>
        <button
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
        {/* Lock-screen style date / greeting */}
        <div className="text-center mt-2 mb-3 sm:mb-4 px-4 sm:px-6">
          <p className="text-[13px] font-medium text-white/85 tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{fullDateStr}</p>
          <h1 className="mt-0.5 text-[28px] sm:text-[34px] leading-[1.05] font-bold tracking-[-0.022em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {greeting}{name ? `, ${name}` : ""}
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
                  <BibleHomeWidgets />
                  <LifePrioritiesPanel />
                  {todayPrompt && (
                    <button
                      onClick={() => navigate(`/journal/new?promptId=${todayPrompt.id}&prompt=${encodeURIComponent(todayPrompt.text)}`)}
                      className="w-full text-left mb-3 p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 mb-1.5">
                        <Lightbulb className="w-3.5 h-3.5" /> Today's prompt
                      </div>
                      <p className="text-[15px] font-medium leading-snug text-zinc-900">{todayPrompt.text}</p>
                    </button>
                  )}
                  {onThisDayCount > 0 && (
                    <button
                      onClick={() => navigate("/journal/today")}
                      className="w-full text-left mb-3 p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 mb-1.5">
                        <CalIcon className="w-3.5 h-3.5" /> On this day
                      </div>
                      <p className="text-[15px] font-medium leading-snug text-zinc-900">
                        {onThisDayCount} {onThisDayCount === 1 ? "entry" : "entries"} from past years
                      </p>
                    </button>
                  )}
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
                    className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6"
                  >
                    {page.indexes.map((i) => {
                      const app = apps[i];
                      return (
                        <AppButton
                          key={app.label}
                          app={app}
                          onClick={() => {
                            if (app.onOpen) app.onOpen();
                            else if (app.to) navigate(app.to);
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Page dots */}
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

function AppButton({ app, onClick }: { app: AppIcon; onClick: () => void }) {
  const Icon = app.icon;
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1.5 sm:gap-[7px] focus:outline-none" aria-label={app.ariaLabel ?? app.label}>
      <div className="relative">
        {Icon && (
          <IosAppIcon
            icon={Icon}
            background={app.color}
            iconColor={app.iconColor ?? "#FFFFFF"}
            imageSrc={app.imageSrc}
            className="transition-transform duration-150 group-active:scale-[0.92]"
          />
        )}
        {app.badge !== undefined && app.badge !== "" && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-[5px] rounded-full bg-[#FF3B30] text-white text-[11px] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.4)] border-[1.5px] border-white flex items-center justify-center tabular-nums leading-none">
            {typeof app.badge === "number" && app.badge > 99 ? "99+" : app.badge}
          </span>
        )}
      </div>
      <span
        className="text-[10.5px] sm:text-[11.5px] font-medium text-white tracking-tight leading-none mt-[3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
      >
        {app.label}
      </span>
    </button>
  );
}
