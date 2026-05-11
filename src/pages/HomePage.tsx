import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, BookOpen, Compass, ListChecks, MessageCircleQuestion,
  Sun, GraduationCap, Sparkles, Mail, Moon, Settings, LogOut, NotebookPen,
  Lightbulb, Calendar as CalIcon,
  type LucideIcon,
} from "lucide-react";

const LAST_READ_KEY = "yb_last_read";
const WALLPAPER_KEY = "yb_home_wallpaper"; // data URL

type AppIcon = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Rich icon background for a more native app-tile look. */
  color: string;
  iconColor?: string;
  badge?: string | number;
};

export default function HomePage() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [todayPrompt, setTodayPrompt] = useState<{ id: string; text: string } | null>(null);
  const [onThisDayCount, setOnThisDayCount] = useState(0);
  const [counts, setCounts] = useState<{ beliefs: number; tensions: number; chats: number; artifacts: number; journalToday: number }>({
    beliefs: 0, tensions: 0, chats: 0, artifacts: 0, journalToday: 0,
  });
  const [wallpaper] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(WALLPAPER_KEY) : null,
  );
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    const startOfDay = new Date(today); startOfDay.setHours(0,0,0,0);
    (async () => {
      const [{ data: prompts }, { data: past }, { data: beliefs }, { data: tensions }, { data: chats }, { data: arts }, { data: jToday }] = await Promise.all([
        supabase.from("journal_prompts").select("id,text").limit(500),
        supabase.from("journal_entries").select("entry_at_ts").lt("entry_at_ts", startOfDay.toISOString()).order("entry_at_ts", { ascending: false }).limit(500),
        supabase.from("belief_nodes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("belief_tensions" as never).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("chat_threads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("artifacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("entry_at_ts", startOfDay.toISOString()),
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.onboarded) return <Navigate to="/onboarding" replace />;

  const lastRead = typeof window !== "undefined" ? localStorage.getItem(LAST_READ_KEY) : null;
  const bibleTo = lastRead ? `/read/${lastRead}` : "/read/Jhn/1";

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

  const initials = (name || user.email || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  // Hide journal-prompt badge once user wrote today
  const promptBadge = !counts.journalToday ? 1 : undefined;

  const apps: AppIcon[] = [
    { label: "Bible",     to: bibleTo,                 icon: BookOpen,              color: "linear-gradient(160deg, #CB3F2A 0%, #FF6E4E 60%, #FF9A63 100%)", badge: lastRead?.replace("/", " ") },
    { label: "Daily",     to: "/framework/daily",      icon: Sun,                   color: "linear-gradient(155deg, #0A84FF 0%, #32AEFF 58%, #7AD9FF 100%)" },
    { label: "Framework", to: "/framework",            icon: Compass,               color: "linear-gradient(160deg, #111827 0%, #222436 58%, #3B4262 100%)" },
    { label: "Chat",      to: "/framework/chat",       icon: MessageCircleQuestion, color: "linear-gradient(160deg, #0FA958 0%, #28CC73 58%, #5AF0A6 100%)", badge: counts.chats || undefined },
    { label: "Journal",   to: "/journal",              icon: NotebookPen,           color: "linear-gradient(160deg, #F26A22 0%, #FF8B3D 58%, #FFB067 100%)", badge: promptBadge },
    { label: "Beliefs",   to: "/framework/beliefs",    icon: ListChecks,            color: "linear-gradient(160deg, #ECECEC 0%, #FCFCFC 62%, #FFFFFF 100%)", iconColor: "#3F3F46", badge: counts.beliefs || undefined },
    { label: "Tensions",  to: "/framework/tensions",   icon: Sparkles,              color: "linear-gradient(160deg, #0D9D96 0%, #18C6BE 58%, #61EAE4 100%)", badge: counts.tensions || undefined },
    { label: "Study",     to: "/framework/study",      icon: GraduationCap,         color: "linear-gradient(160deg, #4C46D1 0%, #6A63FF 58%, #8E8BFF 100%)" },
    { label: "Digest",    to: "/framework/digest",     icon: Mail,                  color: "linear-gradient(160deg, #0073EF 0%, #1A97FF 58%, #57B8FF 100%)" },
    { label: "Library",   to: "/framework/influences", icon: BookOpen,              color: "linear-gradient(160deg, #5E2CCF 0%, #7A43F3 58%, #9A6AFF 100%)", badge: counts.artifacts || undefined },
    { label: "Sleep",     to: "/sleep",                icon: Moon,                  color: "linear-gradient(160deg, #091134 0%, #122056 58%, #20357D 100%)" },
    { label: "Settings",  to: "/settings",             icon: Settings,              color: "linear-gradient(160deg, #6E6E75 0%, #8D8D96 58%, #B4B4BE 100%)" },
  ];

  const fullDateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const wallpaperStyle = wallpaper
    ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" as const }
    : undefined;

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${wallpaper ? "" : "ios-wallpaper"}`}
      style={wallpaperStyle}
    >
      {/* Subtle dark overlay for legibility on photo wallpaper */}
      {wallpaper && <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />}

      <div className="relative z-20 flex items-center justify-end px-5 pt-4">
        <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur border border-white/50 text-white font-semibold flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
          {initials}
        </div>
      </div>

      {/* Sign-out — lock-screen style icon, top right inset */}
      <button
        onClick={() => signOut()}
        className="absolute top-9 right-3 z-20 w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center text-white/90 hover:bg-black/40 transition"
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-2 pb-32">
        {/* Lock-screen style date / greeting */}
        <div className="text-center mt-2 mb-7">
          <p className="text-[13px] font-medium text-white/85 tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{fullDateStr}</p>
          <h1 className="mt-0.5 text-[34px] leading-[1.05] font-bold tracking-[-0.022em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {greeting}{name ? `, ${name}` : ""}
          </h1>
        </div>

        {/* Today's prompt — iOS widget */}
        {todayPrompt && (
          <button
            onClick={() => navigate(`/journal/new?promptId=${todayPrompt.id}&prompt=${encodeURIComponent(todayPrompt.text)}`)}
            className="w-full text-left mb-4 p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition"
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
            className="w-full text-left mb-5 p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 mb-1.5">
              <CalIcon className="w-3.5 h-3.5" /> On this day
            </div>
            <p className="text-[15px] font-medium leading-snug text-zinc-900">
              {onThisDayCount} {onThisDayCount === 1 ? "entry" : "entries"} from past years
            </p>
          </button>
        )}

        {/* App grid — responsive, iPhone (4 col) → iPad (6 col) */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-x-4 gap-y-6">
          {apps.map((app) => (
            <AppButton key={app.label} app={app} onClick={() => navigate(app.to)} />
          ))}
        </div>

        {/* Page dots */}
        <div className="fixed bottom-[112px] left-0 right-0 flex items-center justify-center gap-1.5 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-white/95 shadow" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/45" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/45" />
        </div>

        {/* Dock */}
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-10">
          <div className="flex items-center justify-around gap-1 rounded-[28px] bg-white/35 backdrop-blur-2xl border border-white/50 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.45)] px-3 py-2.5">
            <DockIcon icon={BookOpen}    color="linear-gradient(160deg, #CB3F2A 0%, #FF6E4E 60%, #FF9A63 100%)" onClick={() => navigate(bibleTo)}             label="Bible" />
            <DockIcon icon={Sun}         color="linear-gradient(155deg, #0A84FF 0%, #32AEFF 58%, #7AD9FF 100%)" onClick={() => navigate("/framework/daily")} label="Daily" />
            <DockIcon icon={NotebookPen} color="linear-gradient(160deg, #F26A22 0%, #FF8B3D 58%, #FFB067 100%)" onClick={() => navigate("/journal")}          label="Journal" />
            <DockIcon icon={Compass}     color="linear-gradient(160deg, #111827 0%, #222436 58%, #3B4262 100%)" onClick={() => navigate("/framework")}        label="Framework" />
            <DockIcon icon={Settings}    color="linear-gradient(160deg, #6E6E75 0%, #8D8D96 58%, #B4B4BE 100%)" onClick={() => navigate("/settings")}        label="Settings" />
          </div>
          <div className="mx-auto mt-2 w-[120px] h-[5px] rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
}

function AppButton({ app, onClick }: { app: AppIcon; onClick: () => void }) {
  const Icon = app.icon;
  const iconColor = app.iconColor ?? "white";
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-[7px] focus:outline-none" aria-label={app.label}>
      <div className="relative">
        <div
          className="ios-icon w-[60px] h-[60px] flex items-center justify-center transition-transform duration-150 group-active:scale-[0.92]"
          style={{ background: app.color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 10px 18px -10px rgba(0,0,0,0.55)" }}
        >
          <Icon
            className="w-[30px] h-[30px]"
            style={{ color: iconColor }}
            strokeWidth={2.1}
          />
        </div>
        {app.badge !== undefined && app.badge !== "" && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-[5px] rounded-full bg-[#FF3B30] text-white text-[11px] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.4)] border-[1.5px] border-white flex items-center justify-center tabular-nums leading-none">
            {typeof app.badge === "number" && app.badge > 99 ? "99+" : app.badge}
          </span>
        )}
      </div>
      <span
        className="text-[11.5px] font-medium text-white tracking-tight leading-none mt-[3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
      >
        {app.label}
      </span>
    </button>
  );
}

function DockIcon({ icon: Icon, color, onClick, label }: { icon: LucideIcon; color: string; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="ios-icon ios-icon-dock w-[50px] h-[50px] flex items-center justify-center transition-transform active:scale-[0.92]"
      style={{ background: color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.26), 0 10px 18px -12px rgba(0,0,0,0.55)" }}
    >
      <Icon className="w-[26px] h-[26px] text-white" strokeWidth={2} />
    </button>
  );
}
