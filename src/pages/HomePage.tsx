import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, BookOpen, Compass, ListChecks, MessageCircleQuestion,
  Sun, GraduationCap, Sparkles, Mail, Moon, Settings, LogOut, NotebookPen,
  Lightbulb, Calendar as CalIcon, ImagePlus,
  type LucideIcon,
} from "lucide-react";

const LAST_READ_KEY = "yb_last_read";
const WALLPAPER_KEY = "yb_home_wallpaper"; // data URL

type AppIcon = {
  label: string;
  to: string;
  icon: LucideIcon;
  top: string;
  bottom: string;
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
  const [wallpaper, setWallpaper] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(WALLPAPER_KEY) : null,
  );
  const [now, setNow] = useState<Date>(new Date());
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Hide journal-prompt badge once user wrote today
  const promptBadge = !counts.journalToday ? 1 : undefined;

  const apps: AppIcon[] = [
    { label: "Bible",     to: bibleTo,              icon: BookOpen,              top: "#FF8A4C", bottom: "#C0392B", badge: lastRead?.replace("/", " ") },
    { label: "Daily",     to: "/framework/daily",   icon: Sun,                   top: "#5BC8FF", bottom: "#1E63DD" },
    { label: "Framework", to: "/framework",         icon: Compass,               top: "#3B3B3D", bottom: "#0B0B0C" },
    { label: "Chat",      to: "/framework/chat",    icon: MessageCircleQuestion, top: "#5DDB72", bottom: "#0FA958", badge: counts.chats || undefined },
    { label: "Journal",   to: "/journal",           icon: NotebookPen,           top: "#FFB07A", bottom: "#E0552B", badge: promptBadge },
    { label: "Beliefs",   to: "/framework/beliefs", icon: ListChecks,            top: "#F2F2F7", bottom: "#D1D1D6", badge: counts.beliefs || undefined },
    { label: "Tensions",  to: "/framework/tensions",icon: Sparkles,              top: "#7DE3C2", bottom: "#0FA28C", badge: counts.tensions || undefined },
    { label: "Study",     to: "/framework/study",   icon: GraduationCap,         top: "#7C8AFF", bottom: "#3B45C7" },
    { label: "Digest",    to: "/framework/digest",  icon: Mail,                  top: "#7CC8FF", bottom: "#1A6FF0" },
    { label: "Library",   to: "/framework/influences", icon: BookOpen,           top: "#A78BFA", bottom: "#6D28D9", badge: counts.artifacts || undefined },
    { label: "Sleep",     to: "/sleep",             icon: Moon,                  top: "#1B2A6B", bottom: "#020416" },
    { label: "Settings",  to: "/settings",          icon: Settings,              top: "#C7C7CC", bottom: "#6E6E73" },
  ];

  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "");
  const dateStr = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const fullDateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const onUploadWallpaper = (file: File) => {
    if (file.size > 6 * 1024 * 1024) { alert("Image too large (max 6 MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      localStorage.setItem(WALLPAPER_KEY, url);
      setWallpaper(url);
    };
    reader.readAsDataURL(file);
  };

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

      {/* iOS status bar */}
      <div className="relative z-20 flex items-center justify-between px-7 pt-3 pb-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        <div className="flex items-baseline gap-2 text-[15px] font-semibold tracking-tight tabular-nums">
          <span>{timeStr}</span>
          <span className="text-[12px] font-medium opacity-90">{dateStr}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Signal bars */}
          <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
            <rect x="0"  y="7" width="3" height="4" rx="0.8" />
            <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
            <rect x="9"  y="3" width="3" height="8" rx="0.8" />
            <rect x="13.5" y="0" width="3" height="11" rx="0.8" />
          </svg>
          <span className="text-[11px] font-semibold ml-0.5">5G</span>
          {/* WiFi */}
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden className="ml-1">
            <path d="M1 4 Q8 -2 15 4" /><path d="M3 6.5 Q8 2.5 13 6.5" /><path d="M5.5 9 Q8 7 10.5 9" />
            <circle cx="8" cy="11" r="0.9" fill="currentColor" />
          </svg>
          {/* Battery */}
          <div className="ml-1.5 flex items-center">
            <div className="relative w-[24px] h-[11px] rounded-[3px] border border-current opacity-95">
              <div className="absolute inset-[1.5px] right-[3px] bg-current rounded-[1.5px]" style={{ width: "calc(100% - 5px)" }} />
            </div>
            <div className="w-[1.5px] h-[4px] bg-current rounded-r ml-[1px] opacity-95" />
          </div>
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
            <DockIcon icon={BookOpen}    gradient="from-amber-500 to-rose-700"   onClick={() => navigate(bibleTo)}             label="Bible" />
            <DockIcon icon={Sun}         gradient="from-yellow-400 to-orange-500" onClick={() => navigate("/framework/daily")} label="Daily" />
            <DockIcon icon={NotebookPen} gradient="from-rose-400 to-fuchsia-600"  onClick={() => navigate("/journal")}          label="Journal" />
            <DockIcon icon={Compass}     gradient="from-emerald-500 to-cyan-600"  onClick={() => navigate("/framework")}        label="Framework" />
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Change wallpaper"
              className="ios-icon ios-icon-dock w-[50px] h-[50px] bg-gradient-to-b from-zinc-700 to-zinc-900 flex items-center justify-center transition-transform active:scale-[0.92]"
            >
              <ImagePlus className="w-[24px] h-[24px] text-white" strokeWidth={1.9} />
            </button>
          </div>
          <div className="mx-auto mt-2 w-[120px] h-[5px] rounded-full bg-white/70" />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadWallpaper(f); e.currentTarget.value = ""; }}
      />
    </div>
  );
}

function AppButton({ app, onClick }: { app: AppIcon; onClick: () => void }) {
  const Icon = app.icon;
  const isLight = app.label === "Beliefs";
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-[7px] focus:outline-none" aria-label={app.label}>
      <div className="relative">
        <div
          className="ios-icon w-[60px] h-[60px] flex items-center justify-center transition-transform duration-150 group-active:scale-[0.92]"
          style={{ background: `linear-gradient(180deg, ${app.top} 0%, ${app.bottom} 100%)` }}
        >
          <Icon
            className={`w-[30px] h-[30px] ${isLight ? "text-zinc-700" : "text-white"}`}
            strokeWidth={isLight ? 2.4 : 1.9}
            style={isLight ? undefined : { filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.22))" }}
          />
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
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

function DockIcon({ icon: Icon, gradient, onClick, label }: { icon: LucideIcon; gradient: string; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`ios-icon ios-icon-dock w-[50px] h-[50px] bg-gradient-to-b ${gradient} flex items-center justify-center transition-transform active:scale-[0.92]`}
    >
      <Icon className="w-[26px] h-[26px] text-white" strokeWidth={1.9} style={{ filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.22))" }} />
    </button>
  );
}
