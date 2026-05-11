import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, BookOpen, Compass, ListChecks, MessageCircleQuestion,
  Sun, GraduationCap, Sparkles, Mail, Moon, Settings, LogOut, NotebookPen,
  Lightbulb, Calendar as CalIcon,
  type LucideIcon,
} from "lucide-react";

const LAST_READ_KEY = "yb_last_read"; // "Jhn/1"

type AppIcon = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Top color (HSL or any CSS color) for the icon tile gradient */
  top: string;
  /** Bottom color for the icon tile gradient */
  bottom: string;
  badge?: string;
};

export default function HomePage() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [todayPrompt, setTodayPrompt] = useState<{ id: string; text: string } | null>(null);
  const [onThisDayCount, setOnThisDayCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    (async () => {
      const { data } = await supabase
        .from("journal_prompts")
        .select("id,text")
        .limit(500);
      const list = data ?? [];
      if (list.length) {
        const seed =
          now.getFullYear() * 1000 +
          Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
        const p = list[seed % list.length];
        setTodayPrompt({ id: p.id as string, text: p.text as string });
      }
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const { data: past } = await supabase
        .from("journal_entries")
        .select("entry_at_ts")
        .lt("entry_at_ts", startOfDay.toISOString())
        .order("entry_at_ts", { ascending: false })
        .limit(500);
      const m = now.getMonth();
      const d = now.getDate();
      setOnThisDayCount(
        (past ?? []).filter((e: { entry_at_ts: string }) => {
          const dt = new Date(e.entry_at_ts);
          return dt.getMonth() === m && dt.getDate() === d;
        }).length,
      );
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-texture">
        <Loader2 className="w-6 h-6 animate-spin text-leather/50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.onboarded) return <Navigate to="/onboarding" replace />;

  const lastRead = typeof window !== "undefined" ? localStorage.getItem(LAST_READ_KEY) : null;
  const bibleTo = lastRead ? `/read/${lastRead}` : "/read/Jhn/1";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Peace tonight";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const name = (profile as { display_name?: string; full_name?: string } | null)?.display_name
    ?? (profile as { full_name?: string } | null)?.full_name
    ?? user.email?.split("@")[0]
    ?? "";

  // Colors mirror Apple system app palettes (Books, Weather, Compass, Messages, Journal, Reminders, Mindfulness, Mail, Bedtime, Settings)
  const apps: AppIcon[] = [
    { label: "Bible",     to: bibleTo,              icon: BookOpen,              top: "#FF8A4C", bottom: "#C0392B", badge: lastRead?.replace("/", " ") },
    { label: "Daily",     to: "/framework/daily",   icon: Sun,                   top: "#5BC8FF", bottom: "#1E63DD" },
    { label: "Framework", to: "/framework",         icon: Compass,               top: "#3B3B3D", bottom: "#0B0B0C" },
    { label: "Chat",      to: "/framework/chat",    icon: MessageCircleQuestion, top: "#5DDB72", bottom: "#0FA958" },
    { label: "Journal",   to: "/journal",           icon: NotebookPen,           top: "#FFB07A", bottom: "#E0552B" },
    { label: "Beliefs",   to: "/framework/beliefs", icon: ListChecks,            top: "#F2F2F7", bottom: "#D1D1D6" },
    { label: "Tensions",  to: "/framework/tensions",icon: Sparkles,              top: "#7DE3C2", bottom: "#0FA28C" },
    { label: "Study",     to: "/framework/study",   icon: GraduationCap,         top: "#7C8AFF", bottom: "#3B45C7" },
    { label: "Digest",    to: "/framework/digest",  icon: Mail,                  top: "#7CC8FF", bottom: "#1A6FF0" },
    { label: "Sleep",     to: "/sleep",             icon: Moon,                  top: "#1B2A6B", bottom: "#020416" },
    { label: "Settings",  to: "/settings",          icon: Settings,              top: "#C7C7CC", bottom: "#6E6E73" },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen relative overflow-hidden ios-wallpaper">
      {/* iOS status bar */}
      <div className="relative z-10 flex items-center justify-between px-7 pt-3 pb-1 text-foreground/90">
        <span className="text-[15px] font-semibold tracking-tight tabular-nums">{timeStr}</span>
        <button
          onClick={() => signOut()}
          className="text-[12px] font-medium text-foreground/60 hover:text-foreground transition"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="relative max-w-md mx-auto px-6 pt-2 pb-32">
        {/* Lock-screen style date / greeting */}
        <div className="text-center mt-2 mb-7">
          <p className="text-[13px] font-medium text-foreground/70 tracking-tight">{dateStr}</p>
          <h1 className="mt-0.5 text-[34px] leading-[1.05] font-bold tracking-[-0.022em] text-foreground">
            {greeting}{name ? `, ${name}` : ""}
          </h1>
        </div>

        {/* Today's prompt — iOS widget */}
        {todayPrompt && (
          <button
            onClick={() =>
              navigate(
                `/journal/new?promptId=${todayPrompt.id}&prompt=${encodeURIComponent(todayPrompt.text)}`,
              )
            }
            className="w-full text-left mb-5 p-4 rounded-[22px] bg-white/60 backdrop-blur-2xl border border-white/70 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] active:scale-[0.985] transition"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> Today's prompt
            </div>
            <p className="text-[15px] font-medium leading-snug text-foreground/90">
              {todayPrompt.text}
            </p>
          </button>
        )}

        {onThisDayCount > 0 && (
          <button
            onClick={() => navigate("/journal/today")}
            className="w-full text-left mb-5 p-4 rounded-[22px] bg-white/60 backdrop-blur-2xl border border-white/70 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] active:scale-[0.985] transition"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 mb-1.5">
              <CalIcon className="w-3.5 h-3.5" /> On this day
            </div>
            <p className="text-[15px] font-medium leading-snug text-foreground/90">
              {onThisDayCount} {onThisDayCount === 1 ? "entry" : "entries"} from past years
            </p>
          </button>
        )}

        {/* App grid — iOS Home Screen */}
        <div className="grid grid-cols-4 gap-x-3 gap-y-5">
          {apps.map((app) => (
            <AppButton key={app.label} app={app} onClick={() => navigate(app.to)} />
          ))}
        </div>

        {/* Page dots */}
        <div className="fixed bottom-[112px] left-0 right-0 flex items-center justify-center gap-1.5 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/80" />
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
        </div>

        {/* Dock */}
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-10">
          <div className="flex items-center justify-around gap-1 rounded-[28px] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.25)] px-3 py-2.5">
            <DockIcon icon={BookOpen}            gradient="from-amber-700 to-rose-700"   onClick={() => navigate(bibleTo)}             label="Bible" />
            <DockIcon icon={Sun}                 gradient="from-yellow-400 to-orange-500" onClick={() => navigate("/framework/daily")} label="Daily" />
            <DockIcon icon={NotebookPen}         gradient="from-rose-400 to-fuchsia-600"  onClick={() => navigate("/journal")}          label="Journal" />
            <DockIcon icon={Compass}             gradient="from-emerald-500 to-cyan-600"  onClick={() => navigate("/framework")}        label="Framework" />
          </div>
          {/* Home indicator */}
          <div className="mx-auto mt-2 w-[120px] h-[5px] rounded-full bg-foreground/40" />
        </div>
      </div>
    </div>
  );
}

function AppButton({ app, onClick }: { app: AppIcon; onClick: () => void }) {
  const Icon = app.icon;
  const isLight = app.label === "Beliefs"; // light tile -> dark icon
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-[7px] focus:outline-none"
      aria-label={app.label}
    >
      <div className="relative">
        <div
          className="ios-icon w-[60px] h-[60px] flex items-center justify-center transition-transform duration-150 group-active:scale-[0.92]"
          style={{
            background: `linear-gradient(180deg, ${app.top} 0%, ${app.bottom} 100%)`,
          }}
        >
          <Icon
            className={`w-[30px] h-[30px] ${isLight ? "text-zinc-700" : "text-white"}`}
            strokeWidth={isLight ? 2.4 : 1.9}
            style={
              isLight
                ? undefined
                : { filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.22))" }
            }
          />
          {/* inner rim highlight */}
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
        </div>
        {app.badge && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold shadow-md border border-white/70 flex items-center justify-center">
            {app.badge}
          </span>
        )}
      </div>
      <span
        className="text-[11.5px] font-medium text-foreground/90 tracking-tight leading-none mt-[3px]"
        style={{ textShadow: "0 1px 2px rgba(255,255,255,0.55)" }}
      >
        {app.label}
      </span>
    </button>
  );
}

function DockIcon({
  icon: Icon, gradient, onClick, label,
}: {
  icon: LucideIcon;
  gradient: string;
  onClick: () => void;
  label: string;
}) {
  // gradient prop kept as "from-X to-Y" pair; pull two tailwind colors via a quick map
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`ios-icon ios-icon-dock w-[50px] h-[50px] bg-gradient-to-b ${gradient.replace("from-", "from-").replace("to-", "to-")}
        flex items-center justify-center
        transition-transform active:scale-[0.92]`}
    >
      <Icon
        className="w-[26px] h-[26px] text-white"
        strokeWidth={1.9}
        style={{ filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.22))" }}
      />
    </button>
  );
}