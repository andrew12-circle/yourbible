import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, Network, Sparkles, FileStack } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  title?: string;
  back?: string;
}

const NAV = [
  { to: "/framework", label: "Overview", icon: Sparkles },
  { to: "/framework/beliefs", label: "Beliefs", icon: Network },
  { to: "/framework/artifacts", label: "Artifacts", icon: FileStack },
];

export default function FrameworkLayout({ children, title, back }: Props) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to={back ?? "/"}
            className="p-2 -ml-2 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              My Framework
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
        <nav className="max-w-4xl mx-auto px-4 pb-2 flex gap-1 text-sm">
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
                  "px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}