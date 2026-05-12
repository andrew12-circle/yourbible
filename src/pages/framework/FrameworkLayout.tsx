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
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-5 py-3.5 flex items-center gap-3">
          <Link
            to={back ?? "/"}
            className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/90">
              My Framework
            </div>
            {title && (
              <h1 className="text-xl font-semibold tracking-tight text-foreground truncate mt-0.5">
                {title}
              </h1>
            )}
          </div>
          <Link
            to="/read/Jhn/1"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/25 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <BookOpen className="w-3.5 h-3.5 opacity-80" aria-hidden />
            Reader
          </Link>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-5 pb-3">
          <nav
            className="flex w-full overflow-x-auto gap-1 p-1 rounded-2xl bg-muted/40 ring-1 ring-border/50 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Framework sections"
          >
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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex-1 min-w-[4.5rem] sm:min-w-0 sm:flex-initial shrink-0 justify-center px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-all duration-200 ease-out whitespace-nowrap",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted/40",
                    active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}