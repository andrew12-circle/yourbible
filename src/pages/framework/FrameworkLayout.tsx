import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, Network, Sparkles, FileStack, Share2, AlertTriangle, Users, Sprout, ClipboardList, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import AiWritingAssistToggle from "@/components/writing/AiWritingAssistToggle";

interface Props {
  children: ReactNode;
  title?: string;
  back?: string;
  /** Optional main width; defaults to `max-w-4xl`. */
  contentClassName?: string;
  /** Optional header row/nav max-width; defaults to `max-w-4xl`. Use with a wide `contentClassName` so the sticky header aligns with the page. */
  headerContentClassName?: string;
  /** Content-first layout: hide framework section tabs and simplify the header (auto on artifact detail routes). */
  immersive?: boolean;
  /** Right-side actions beside title (e.g. paste transcript on artifact detail). */
  headerActions?: ReactNode;
  /** Rich header block (e.g. YouTube thumbnail + title + channel) replaces plain `title` when set. */
  headerLeading?: ReactNode;
}

/** `/framework/artifacts/:id` — not list (`/artifacts`) or new (`/artifacts/new`). */
export function isArtifactDetailPath(pathname: string): boolean {
  return /^\/framework\/artifacts\/(?!new$)[^/]+$/.test(pathname);
}

const NAV = [
  { to: "/framework", label: "Overview", icon: Sparkles },
  { to: "/framework/journey", label: "Journey", icon: Sprout },
  { to: "/framework/playbook", label: "Playbook", icon: ClipboardList },
  { to: "/framework/artifacts", label: "Artifacts", icon: FileStack },
  { to: "/framework/research-later", label: "Research later", icon: Clock },
  { to: "/framework/graph", label: "Graph", icon: Share2 },
  { to: "/framework/beliefs", label: "Beliefs", icon: Network },
  { to: "/framework/influences", label: "Influences", icon: Users },
  { to: "/framework/tensions", label: "Tensions", icon: AlertTriangle },
];

export default function FrameworkLayout({
  children,
  title,
  back,
  contentClassName,
  headerContentClassName,
  immersive: immersiveProp,
  headerActions,
  headerLeading,
}: Props) {
  const { pathname } = useLocation();
  const immersive = immersiveProp ?? isArtifactDetailPath(pathname);
  const headerMax = headerContentClassName ?? "max-w-4xl";
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header
        className={cn(
          "sticky top-0 z-30 border-b backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
          immersive
            ? "border-border/60 bg-background/92 shadow-sm supports-[backdrop-filter]:bg-background/85"
            : "border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/70",
        )}
      >
        <div
          className={cn(
            "mx-auto flex gap-2 px-4 sm:gap-3 sm:px-5",
            headerLeading && immersive
              ? "items-start py-3 sm:items-center sm:py-3.5"
              : immersive
                ? "items-center py-3 sm:py-3.5"
                : "items-center py-3.5",
            headerMax,
          )}
        >
          <Link
            to={back ?? "/"}
            className={cn(
              "rounded-xl text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              immersive
                ? "inline-flex shrink-0 items-center gap-1.5 border border-border/60 bg-card/90 px-2.5 py-1.5 text-xs font-medium shadow-sm hover:border-border hover:bg-muted/40 hover:text-foreground"
                : "p-2 -ml-2 hover:bg-muted/80 hover:text-foreground",
            )}
            aria-label={immersive ? "Back to artifacts" : "Back"}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
            {immersive ? <span className="hidden sm:inline">Artifacts</span> : null}
          </Link>
          <div
            className={cn(
              "min-w-0 flex-1",
              immersive && !headerLeading && "border-l border-border/50 pl-2.5 sm:pl-3",
              headerLeading && immersive && "border-l border-border/50 pl-2.5 sm:pl-3",
            )}
          >
            {headerLeading ? (
              headerLeading
            ) : (
              <>
                {!immersive && (
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/90">
                    My Framework
                  </div>
                )}
                {title ? (
                  <h1
                    className={cn(
                      "tracking-tight text-foreground truncate",
                      immersive
                        ? "font-display text-lg font-normal leading-snug sm:text-xl"
                        : "mt-0.5 text-xl font-semibold",
                    )}
                  >
                    {title}
                  </h1>
                ) : null}
              </>
            )}
          </div>
          {headerActions ? (
            <div
              className={cn(
                "flex shrink-0 flex-wrap items-center justify-end",
                immersive
                  ? "gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]"
                  : "gap-1.5 sm:gap-2",
              )}
            >
              {headerActions}
            </div>
          ) : null}
          {!immersive && (
            <div className="flex shrink-0 items-start gap-2 sm:gap-3">
              <div className="hidden pt-0.5 sm:block">
                <AiWritingAssistToggle compact />
              </div>
              <Link
                to="/read/Jhn/1"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/25 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <BookOpen className="w-3.5 h-3.5 opacity-80" aria-hidden />
                Reader
              </Link>
            </div>
          )}
        </div>
        {!immersive && (
          <div className={cn("mx-auto px-4 sm:px-5 pb-3 sm:hidden", headerMax)}>
            <AiWritingAssistToggle compact />
          </div>
        )}
        {!immersive && (
          <div className={cn("mx-auto px-4 sm:px-5 pb-3", headerMax)}>
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
        )}
      </header>
      <main
        className={cn(
          "mx-auto px-4 sm:px-5",
          immersive ? "py-5 sm:py-6" : "py-8 sm:py-10",
          contentClassName ?? "max-w-4xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
