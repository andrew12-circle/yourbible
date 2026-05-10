import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, BookOpen, Compass, ListChecks, MessageCircleQuestion,
  Sun, GraduationCap, Sparkles, Mail, Moon, Settings, LogOut,
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
    { label: "Beliefs",   to: "/framework/beliefs", icon: ListChecks,           gradient: "from-violet-500 via-purple-500 to-fuchsia-600" },
    { label: "Tensions",  to: "/framework/tensions",icon: Sparkles,             gradient: "from-pink-500 via-rose-500 to-red-500" },
    { label: "Study",     to: "/framework/study",   icon: GraduationCap,        gradient: "from-indigo-500 via-blue-600 to-slate-700" },
    { label: "Digest",    to: "/framework/digest",  icon: Mail,                 gradient: "from-lime-500 via-green-500 to-emerald-600" },
    { label: "Sleep",     to: "/sleep",             icon: Moon,                 gradient: "from-slate-700 via-indigo-900 to-slate-900" },
    { label: "Settings",  to: "/settings",          icon: Settings,             gradient: "from-zinc-400 via-slate-500 to-slate-600" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sky-200 via-indigo-200 to-rose-200">
      {/* soft glow blobs */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-fuchsia-300/40 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-24 w-96 h-96 rounded-full bg-amber-300/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-cyan-300/40 blur-3xl" />

      <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-24">
        {/* Status-bar-ish header */}
        <div className="flex items-center justify-between mb-8 text-white/90">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/70 drop-shadow">{greeting}</p>
            <h1 className="text-2xl font-semibold text-white drop-shadow-md">{name || "Friend"}</h1>
          </div>
          <button
            onClick={() => signOut()}
            className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-sm hover:bg-white/35 transition"
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

        {/* Dock */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center justify-around gap-2 rounded-3xl bg-white/30 backdrop-blur-2xl border border-white/40 shadow-lg p-3">
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
      <span className="text-[12px] font-medium text-white drop-shadow-md tracking-tight">
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