import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, Network, Sparkles, FileStack, Share2, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  title?: string;
  back?: string;
}

const NAV = [
  { to: "/framework", label: "Overview", icon: Sparkles },
  { to: "/framework/beliefs", label: "Beliefs", icon: Network },
  { to: "/framework/graph", label: "Graph", icon: Share2 },
  { to: "/framework/tensions", label: "Tensions", icon: AlertTriangle },
  { to: "/framework/influences", label: "Influences", icon: Users },
  { to: "/framework/artifacts", label: "Artifacts", icon: FileStack },
];

export default function FrameworkLayout({ children, title, back }: Props) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link
            to={back ?? "/"}
            className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Belief Architecture Engine
            </div>
            {title && (
              <h1 className="font-display text-xl truncate">{title}</h1>
            )}
          </div>
          <Link
            to="/read/Jhn/1"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" /> Reader
          </Link>
        </div>
        <nav className="max-w-5xl mx-auto px-5 pb-3 flex gap-1.5 text-sm overflow-x-auto">
          {NAV.map((n) => {
            const active =
              n.to === "/framework"
                ? pathname === "/framework"
                : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors whitespace-nowrap",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
