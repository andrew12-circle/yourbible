import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, BookOpen, Compass, ListChecks, MessageCircleQuestion, Sun, GraduationCap, Sparkles, Mail, Moon, Settings } from "lucide-react";

const LAST_READ_KEY = "yb_last_read"; // "Jhn/1"

type Tile = {
  label: string;
  subtitle: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "leather" | "gold" | "ink";
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

  const primary: Tile[] = [
    { label: "Bible", subtitle: lastRead ? `Continue · ${lastRead.replace("/", " ")}` : "Open & read", to: bibleTo, icon: BookOpen, accent: "leather" },
    { label: "Daily", subtitle: "Today's reading", to: "/framework/daily", icon: Sun, accent: "gold" },
    { label: "Framework", subtitle: "Your beliefs", to: "/framework", icon: Compass, accent: "leather" },
    { label: "Chat", subtitle: "Socratic partner", to: "/framework/chat", icon: MessageCircleQuestion, accent: "ink" },
  ];

  const secondary: Tile[] = [
    { label: "Beliefs", subtitle: "Browse all", to: "/framework/beliefs", icon: ListChecks },
    { label: "Tensions", subtitle: "Open questions", to: "/framework/tensions", icon: Sparkles },
    { label: "Study", subtitle: "Topical plans", to: "/framework/study", icon: GraduationCap },
    { label: "Digest", subtitle: "Weekly drift", to: "/framework/digest", icon: Mail },
    { label: "Sleep", subtitle: "Night mode", to: "/sleep", icon: Moon },
    { label: "Settings", subtitle: "Preferences", to: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen paper-texture">
      <div className="max-w-3xl mx-auto px-5 pt-10 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-leather/50 mb-1">{greeting}</p>
            <h1 className="font-serif text-3xl text-leather-deep">{name || "Friend"}</h1>
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs text-leather/50 hover:text-leather transition px-2 py-1"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>

        {/* Primary tiles — large */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {primary.map((t) => (
            <TileCard key={t.label} tile={t} large onClick={() => navigate(t.to)} />
          ))}
        </div>

        {/* Secondary tiles — compact */}
        <div className="grid grid-cols-3 gap-3">
          {secondary.map((t) => (
            <TileCard key={t.label} tile={t} onClick={() => navigate(t.to)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TileCard({ tile, large, onClick }: { tile: Tile; large?: boolean; onClick: () => void }) {
  const Icon = tile.icon;
  const accentClass =
    tile.accent === "gold"
      ? "bg-gradient-to-br from-[hsl(var(--gold-bright))]/15 to-[hsl(var(--gold-deep))]/10 border-[hsl(var(--gold))]/30"
      : tile.accent === "ink"
      ? "bg-gradient-to-br from-leather-deep/8 to-leather/5 border-leather/20"
      : tile.accent === "leather"
      ? "bg-gradient-to-br from-leather/10 to-leather-deep/5 border-leather/25"
      : "bg-card/60 border-border/60";

  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-xl border ${accentClass} backdrop-blur-sm
        ${large ? "p-5 min-h-[120px]" : "p-3 min-h-[88px]"}
        shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
        transition-all duration-200 flex flex-col justify-between`}
    >
      <Icon className={`${large ? "w-6 h-6" : "w-5 h-5"} text-leather`} />
      <div>
        <div className={`font-serif text-leather-deep ${large ? "text-lg" : "text-sm"}`}>{tile.label}</div>
        <div className={`text-leather/55 ${large ? "text-xs" : "text-[10px]"} mt-0.5`}>{tile.subtitle}</div>
      </div>
    </button>
  );
}