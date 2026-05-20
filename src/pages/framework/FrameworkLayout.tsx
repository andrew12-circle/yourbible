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

/** Wide library surfaces (artifact grid, new artifact). */
export function isArtifactsLibraryPath(pathname: string): boolean {
  return pathname === "/framework/artifacts" || pathname.startsWith("/framework/artifacts/new");
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
  const studioLibrary = isArtifactsLibraryPath(pathname);
  const headerMax =
    headerContentClassName ??
    (studioLibrary ? "max-w-[min(92rem,calc(100vw-1.25rem))]" : "max-w-4xl");
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header
        className={cn(
          "sticky top-0 z-30 border-b backdrop-blur-md",
          immersive
            ? "border-border/60 bg-background/92 shadow-sm supports-[backdrop-filter]:bg-background/85"
            : studioLibrary
              ? "border-border/50 bg-background/88 supports-[backdrop-filter]:bg-background/82"
              : "border-border/40 bg-background/85 supports-[backdrop-filter]:bg-background/78",
        )}
      >
        <div
          className={cn(
            "mx-auto flex gap-2 px-4 sm:gap-3 sm:px-5",
            headerLeading && immersive
              ? "items-start py-3 sm:items-center sm:py-3.5"
              : "items-center py-2.5 sm:py-3",
            headerMax,
          )}
        >
          <Link
            to={back ?? "/"}
            className={cn(
              "shrink-0 rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              immersive
                ? "inline-flex items-center gap-1.5 border border-border/60 bg-card/90 px-2.5 py-1.5 text-xs font-medium shadow-sm hover:border-border hover:bg-muted/40 hover:text-foreground"
                : "inline-flex h-9 w-9 items-center justify-center hover:bg-muted/50 hover:text-foreground",
            )}
            aria-label={immersive ? "Back to artifacts" : "Back"}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {immersive ? <span className="hidden sm:inline">Artifacts</span> : null}
          </Link>
          <div className="min-w-0 flex-1">
            {headerLeading ? (
              headerLeading
            ) : title ? (
              <h1
                className={cn(
                  "truncate tracking-tight text-foreground",
                  immersive || studioLibrary
                    ? "font-display text-xl font-normal sm:text-2xl"
                    : "text-lg font-semibold sm:text-xl",
                )}
              >
                {title}
              </h1>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-1.5">
              {headerActions}
            </div>
          ) : null}
          {!immersive && (
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <AiWritingAssistToggle compact />
              <Link
                to="/read/Jhn/1"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
              >
                <BookOpen className="h-3.5 w-3.5 opacity-80" aria-hidden />
                <span className="hidden sm:inline">Reader</span>
              </Link>
            </div>
          )}
        </div>
        {!immersive && (
          <div className={cn("mx-auto px-4 pb-2.5 sm:px-5 sm:pb-3", headerMax)}>
            <nav
              className="flex w-full gap-0.5 overflow-x-auto rounded-full bg-muted/35 p-1 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/25 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                      "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-3.5 sm:text-[13px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/55 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden />
                    <span>{n.label}</span>
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
          immersive ? "py-5 sm:py-6" : studioLibrary ? "py-5 sm:py-6" : "py-8 sm:py-10",
          contentClassName ?? "max-w-4xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
