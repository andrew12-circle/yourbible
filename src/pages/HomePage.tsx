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
  /** Tailwind gradient classes for the icon tile */
  gradient: string;
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

  const apps: AppIcon[] = [
    { label: "Bible",     to: bibleTo,              icon: BookOpen,             gradient: "from-amber-700 via-orange-600 to-rose-700",     badge: lastRead?.replace("/", " ") },
    { label: "Daily",     to: "/framework/daily",   icon: Sun,                  gradient: "from-yellow-400 via-amber-400 to-orange-500" },
    { label: "Framework", to: "/framework",         icon: Compass,              gradient: "from-emerald-500 via-teal-500 to-cyan-600" },
    { label: "Chat",      to: "/framework/chat",    icon: MessageCircleQuestion, gradient: "from-sky-500 via-blue-500 to-indigo-600" },
    { label: "Journal",   to: "/journal",           icon: NotebookPen,          gradient: "from-rose-400 via-pink-500 to-fuchsia-600" },
    { label: "Beliefs",   to: "/framework/beliefs", icon: ListChecks,           gradient: "from-violet-500 via-purple-500 to-fuchsia-600" },
    { label: "Tensions",  to: "/framework/tensions",icon: Sparkles,             gradient: "from-pink-500 via-rose-500 to-red-500" },
    { label: "Study",     to: "/framework/study",   icon: GraduationCap,        gradient: "from-indigo-500 via-blue-600 to-slate-700" },
    { label: "Digest",    to: "/framework/digest",  icon: Mail,                 gradient: "from-lime-500 via-green-500 to-emerald-600" },
    { label: "Sleep",     to: "/sleep",             icon: Moon,                 gradient: "from-slate-700 via-indigo-900 to-slate-900" },
    { label: "Settings",  to: "/settings",          icon: Settings,             gradient: "from-zinc-400 via-slate-500 to-slate-600" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden app-mesh">
      <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-24">
        {/* Status-bar-ish header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{greeting}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name || "Friend"}</h1>
          </div>
          <button
            onClick={() => signOut()}
            className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/80 flex items-center justify-center text-foreground shadow-sm hover:bg-white transition"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* App grid — iOS style */}
        <div className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-5 sm:gap-x-6 sm:gap-y-8">
          {apps.map((app) => (
            <AppButton key={app.label} app={app} onClick={() => navigate(app.to)} />
          ))}
        </div>

        {/* Today's prompt + On this day */}
        {(todayPrompt || onThisDayCount > 0) && (
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {todayPrompt && (
              <button
                onClick={() =>
                  navigate(
                    `/journal/new?promptId=${todayPrompt.id}&prompt=${encodeURIComponent(todayPrompt.text)}`,
                  )
                }
                className="text-left p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 hover:shadow-md transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 mb-2">
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
                className="text-left p-5 rounded-3xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200/70 hover:shadow-md transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 mb-2">
                  <CalIcon className="w-3.5 h-3.5" /> On this day
                </div>
                <p className="text-[15px] font-medium leading-snug text-foreground/90">
                  {onThisDayCount} {onThisDayCount === 1 ? "entry" : "entries"} from past years
                </p>
              </button>
            )}
          </div>
        )}


        {/* Dock */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center justify-around gap-2 rounded-3xl bg-white/55 backdrop-blur-2xl border border-white/70 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.25)] p-3">
            <DockIcon icon={BookOpen}            gradient="from-amber-700 to-rose-700"   onClick={() => navigate(bibleTo)}             label="Bible" />
            <DockIcon icon={Sun}                 gradient="from-yellow-400 to-orange-500" onClick={() => navigate("/framework/daily")} label="Daily" />
            <DockIcon icon={MessageCircleQuestion} gradient="from-sky-500 to-indigo-600"   onClick={() => navigate("/framework/chat")}  label="Chat" />
            <DockIcon icon={Compass}             gradient="from-emerald-500 to-cyan-600"  onClick={() => navigate("/framework")}        label="Framework" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppButton({ app, onClick }: { app: AppIcon; onClick: () => void }) {
  const Icon = app.icon;
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 focus:outline-none"
      aria-label={app.label}
    >
      <div className="relative">
        <div
          className={`w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-[22px] bg-gradient-to-br ${app.gradient}
            shadow-[0_8px_20px_-6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.4)]
            flex items-center justify-center
            transition-transform duration-150 group-active:scale-90 group-hover:-translate-y-0.5`}
        >
          <Icon className="w-8 h-8 text-white drop-shadow" strokeWidth={2.2} />
          {/* glossy highlight */}
          <span className="pointer-events-none absolute inset-x-2 top-1 h-3 rounded-t-full bg-white/30 blur-[2px]" />
        </div>
        {app.badge && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-semibold shadow-md border border-white/60">
            {app.badge}
          </span>
        )}
      </div>
      <span className="text-[12px] font-medium text-foreground/90 tracking-tight">
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
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient}
        shadow-[0_4px_10px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)]
        flex items-center justify-center
        transition-transform active:scale-90 hover:-translate-y-0.5`}
    >
      <Icon className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
    </button>
  );
}