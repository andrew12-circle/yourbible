import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, BookOpen, ListChecks, ListTodo, CheckSquare, MessageCircleHeart,
  Sun, GraduationCap, Sparkles, Mail, Moon, Settings, NotebookPen, Brain,
  Lightbulb, Calendar as CalIcon, User, Youtube, HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import { HOME_PROFILE_PHOTO_STORAGE_KEY } from "@/lib/homeProfilePhoto";
import { LifeWeeksTile } from "@/components/home/LifeWeeksTile";
import { LifePrioritiesPanel } from "@/components/home/LifePrioritiesPanel";
const LAST_READ_KEY = "yb_last_read";
const WALLPAPER_KEY = "yb_home_wallpaper"; // data URL

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
  type PageDef = { type: "apps"; indexes: number[] } | { type: "widgets" };
  const [pages, setPages] = useState<PageDef[]>([
    { type: "apps", indexes: [] },
    { type: "widgets" },
  ]);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!profile?.layout) return;
    try {
      const parsed = JSON.parse(profile.layout) as { homeWallpaper?: string; homeWallpaperTint?: number; homeWallpaperBlur?: number; homeProfilePhoto?: string };
      if (parsed.homeWallpaper) {
        setWallpaper(parsed.homeWallpaper);
        localStorage.setItem(WALLPAPER_KEY, parsed.homeWallpaper);
      }
      if (typeof parsed.homeWallpaperTint === "number") setWallpaperTint(parsed.homeWallpaperTint);
      if (typeof parsed.homeWallpaperBlur === "number") setWallpaperBlur(parsed.homeWallpaperBlur);
      if (parsed.homeProfilePhoto) {
        setProfilePhoto(parsed.homeProfilePhoto);
        localStorage.setItem(HOME_PROFILE_PHOTO_STORAGE_KEY, parsed.homeProfilePhoto);
      }
    } catch {
      // Keep defaults when legacy/plain layout values are present.
    }
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
    { label: "Bible",     to: bibleTo,                 icon: BookOpen,              color: "linear-gradient(160deg, #CB3F2A 0%, #FF6E4E 60%, #FF9A63 100%)", badge: lastRead?.replace("/", " ") },
    { label: "Daily",     to: "/framework/daily",      icon: Sun,                   color: "linear-gradient(155deg, #0A84FF 0%, #32AEFF 58%, #7AD9FF 100%)" },
    { label: "Framework", to: "/framework",            icon: Brain,                 color: "#FF2D55", iconColor: "white" },
    { label: "Journal",   to: "/journal",              icon: NotebookPen,           color: "linear-gradient(160deg, #F26A22 0%, #FF8B3D 58%, #FFB067 100%)", badge: promptBadge },
    {
      label: "Walking together",
      to: "/partner",
      icon: HeartHandshake,
      color: "linear-gradient(160deg, #FB7185 0%, #F43F5E 52%, #BE123C 100%)",
      iconColor: "white",
      ariaLabel: "Walking together with a partner",
    },
    { label: "Beliefs",   to: "/framework/beliefs",    icon: ListChecks,            color: "linear-gradient(160deg, #ECECEC 0%, #FCFCFC 62%, #FFFFFF 100%)", iconColor: "#3F3F46", badge: counts.beliefs || undefined },
    { label: "Tensions",  to: "/framework/tensions",   icon: Sparkles,              color: "linear-gradient(160deg, #0D9D96 0%, #18C6BE 58%, #61EAE4 100%)", badge: counts.tensions || undefined },
    { label: "Study",     to: "/framework/study",      icon: GraduationCap,         color: "linear-gradient(160deg, #4C46D1 0%, #6A63FF 58%, #8E8BFF 100%)" },
    { label: "Digest",    to: "/framework/digest",     icon: Mail,                  color: "linear-gradient(160deg, #0073EF 0%, #1A97FF 58%, #57B8FF 100%)" },
    { label: "Library",   to: "/framework/influences", icon: BookOpen,              color: "linear-gradient(160deg, #5E2CCF 0%, #7A43F3 58%, #9A6AFF 100%)", badge: counts.artifacts || undefined },
    { label: "Tasks",     to: "/life/todos",           icon: ListTodo,              color: "linear-gradient(160deg, #2563EB 0%, #3B82F6 58%, #93C5FD 100%)" },
    { label: "Habits",    to: "/life/habits",          icon: CheckSquare,           color: "linear-gradient(160deg, #059669 0%, #10B981 58%, #6EE7B7 100%)", iconColor: "white" },
    { label: "Sleep",     to: "/sleep",                icon: Moon,                  color: "linear-gradient(160deg, #091134 0%, #122056 58%, #20357D 100%)" },
    { label: "YouTube",   onOpen: openYouTubeAppOrWeb, icon: Youtube,               color: "#FF2D2D", iconColor: "white", ariaLabel: "Open YouTube" },
    {
      label: "My AI",
      to: "/my-ai",
      icon: MessageCircleHeart,
      color: "linear-gradient(160deg, #0FA958 0%, #28CC73 58%, #5AF0A6 100%)",
      iconColor: "white",
      ariaLabel: "Open My AI — framework-grounded chat",
      badge: counts.chats || undefined,
    },
    { label: "Settings",  to: "/settings",             icon: Settings,              color: "linear-gradient(160deg, #6E6E75 0%, #8D8D96 58%, #B4B4BE 100%)" },
  ];

  const appCount = apps.length;
  useLayoutEffect(() => {
    const calc = () => {
      const vh = window.innerHeight;
      const w = window.innerWidth;
      const reserveTop = 130;
      const reserveBottom = 170;
      const cols = w < 640 ? 4 : w < 768 ? 5 : 6;
      const rowH = w < 640 ? 86 : 102;
      const avail = vh - reserveTop - reserveBottom;
      const rowsPerPage = Math.max(2, Math.floor(avail / rowH));
      const perPage = Math.max(cols, rowsPerPage * cols);
      const weeksH = weeksStripRef.current?.offsetHeight ?? 96;
      const availFirst = Math.max(rowH * 2, avail - weeksH - 12);
      const rowsFirst = Math.max(2, Math.floor(availFirst / rowH));
      const firstPerPage = Math.min(appCount, Math.max(cols, rowsFirst * cols));
      const indices: number[] = Array.from({ length: appCount }, (_, i) => i);
      const result: PageDef[] = [];
      result.push({ type: "apps", indexes: indices.slice(0, firstPerPage) });
      result.push({ type: "widgets" });
      let i = firstPerPage;
      while (i < appCount) {
        result.push({ type: "apps", indexes: indices.slice(i, i + perPage) });
        i += perPage;
      }
      setPages(result);
    };
    calc();
    const ro = weeksStripRef.current ? new ResizeObserver(calc) : null;
    if (weeksStripRef.current && ro) ro.observe(weeksStripRef.current);
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", calc);
    return () => {
      ro?.disconnect();
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

      <div className="relative z-10 max-w-3xl mx-auto pt-2 pb-40 sm:pb-32">
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
          className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: "x mandatory", overscrollBehaviorX: "contain" }}
        >
          {pages.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className={`w-full shrink-0 snap-start px-4 sm:px-6 ${
                page.type === "widgets" || (page.type === "apps" && pageIdx === 0) ? "overflow-y-auto" : ""
              }`}
              style={
                page.type === "widgets" || (page.type === "apps" && pageIdx === 0)
                  ? { maxHeight: "calc(100dvh - 200px)" }
                  : undefined
              }
            >
              {page.type === "widgets" ? (
                <div ref={widgetsRef}>
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
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6">
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
        <div className="fixed bottom-[calc(104px+env(safe-area-inset-bottom))] left-0 right-0 flex items-center justify-center gap-1.5 z-10">
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

        {/* Dock */}
        <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-xl z-10">
          <div className="flex items-center justify-around gap-1 rounded-[24px] sm:rounded-[28px] bg-white/35 backdrop-blur-2xl border border-white/50 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.45)] px-2 sm:px-3 py-2 sm:py-2.5">
            <DockIcon icon={BookOpen}    color="linear-gradient(160deg, #CB3F2A 0%, #FF6E4E 60%, #FF9A63 100%)" onClick={() => navigate(bibleTo)}             label="Bible" />
            <DockIcon icon={Sun}         color="linear-gradient(155deg, #0A84FF 0%, #32AEFF 58%, #7AD9FF 100%)" onClick={() => navigate("/framework/daily")} label="Daily" />
            <DockIcon icon={NotebookPen} color="linear-gradient(160deg, #F26A22 0%, #FF8B3D 58%, #FFB067 100%)" onClick={() => navigate("/journal")} label="Journal" />
            <DockIcon icon={Brain} color="#FF2D55" onClick={() => navigate("/framework")} label="Framework" iconColor="white" />
          </div>
          <div className="mx-auto mt-2 w-[96px] sm:w-[120px] h-[5px] rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
}

function AppButton({ app, onClick }: { app: AppIcon; onClick: () => void }) {
  const Icon = app.icon;
  const iconColor = app.iconColor ?? "white";
  const isBible = app.label === "Bible";
  const isJournal = app.label === "Journal";
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1.5 sm:gap-[7px] focus:outline-none" aria-label={app.ariaLabel ?? app.label}>
      <div className="relative">
        <div
          className="ios-icon w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] flex items-center justify-center transition-transform duration-150 group-active:scale-[0.92]"
          style={{ background: app.color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 10px 18px -10px rgba(0,0,0,0.55)" }}
        >
          {app.imageSrc ? (
            <img src={app.imageSrc} alt="" className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] object-cover rounded-[15px] sm:rounded-[17px]" />
          ) : (
            <>
              {isBible && (
                <>
                  <div className="absolute inset-x-[8px] top-[9px] text-[8px] leading-[0.95] font-semibold tracking-[0.06em] text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
                    HOLY
                    <br />
                    BIBLE
                  </div>
                  <div className="absolute left-[7px] right-[7px] bottom-[8px] h-[11px] rounded-b-[9px] rounded-t-[3px] bg-amber-50/90 border border-amber-100/70" />
                  <div className="absolute left-[11px] bottom-[10px] w-[10px] h-[9px] bg-rose-500 rounded-[2px]" style={{ clipPath: "polygon(0 0,100% 0,100% 78%,50% 100%,0 78%)" }} />
                </>
              )}

              {isJournal && (
                <>
                  <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-[26px] h-[27px] bg-white/90 rounded-t-[4px] rounded-b-[1px]" />
                  <div className="absolute top-[33px] left-1/2 -translate-x-1/2 w-[26px] h-[8px] bg-white/90" style={{ clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
                </>
              )}

              {Icon && (
                <Icon
                  className={`w-[21px] h-[21px] sm:w-[30px] sm:h-[30px] ${isBible || isJournal ? "opacity-0" : ""}`}
                  style={{ color: iconColor }}
                  strokeWidth={2.1}
                />
              )}
            </>
          )}
        </div>
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

function DockIcon({ icon: Icon, imageSrc, color, onClick, label, iconColor = "white" }: { icon?: LucideIcon; imageSrc?: string; color: string; onClick: () => void; label: string; iconColor?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="ios-icon ios-icon-dock w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] flex items-center justify-center transition-transform active:scale-[0.92]"
      style={{ background: color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.26), 0 10px 18px -12px rgba(0,0,0,0.55)" }}
    >
      {imageSrc ? (
        <img src={imageSrc} alt="" className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] object-cover rounded-[14px]" />
      ) : Icon ? (
        <Icon className="w-[22px] h-[22px] sm:w-[26px] sm:h-[26px]" style={{ color: iconColor }} strokeWidth={2} />
      ) : null}
    </button>
  );
}
