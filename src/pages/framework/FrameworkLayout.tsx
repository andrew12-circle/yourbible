import { ReactNode, useLayoutEffect, useRef } from "react";
import {
  ARTIFACT_TABLET_MIN_PX,
  ARTIFACT_VIDEO_PIP_MIN_PX,
} from "@/lib/framework/artifactSurfaces";
import { ARTIFACT_STICKY_VIDEO_H } from "@/lib/framework/artifactLayoutCss";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Network,
  Sparkles,
  FileStack,
  Layers,
  Share2,
  AlertTriangle,
  Users,
  Sprout,
  ClipboardList,
  Clock,
} from "lucide-react";
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
  /** One-line title on mobile when `headerLeading` is set (immersive artifact detail). */
  immersiveCompactTitle?: string;
  /** Phone/tablet immersive (<lg): hide framework header; title lives in page body (e.g. YouTube detail). */
  immersiveMobileMinimal?: boolean;
  /** Desktop artifact detail: hide framework header at lg+ (hero owns navigation). */
  immersiveDesktopMinimal?: boolean;
  /** Trailing control on mobile immersive header (e.g. menu). */
  headerTrailing?: ReactNode;
}

/** `/framework/artifacts/:id` — not list (`/artifacts`) or new (`/artifacts/new`). */
export function isArtifactDetailPath(pathname: string): boolean {
  return /^\/framework\/artifacts\/(?!new$)[^/]+$/.test(pathname);
}

/** `/framework/artifacts/:id/research/:claimId` — focused claim research (no framework nav). */
export function isClaimResearchPath(pathname: string): boolean {
  return /^\/framework\/artifacts\/[^/]+\/research\/[^/]+$/.test(pathname);
}

/** Wide library surfaces (artifact grid, new artifact). */
export function isArtifactsLibraryPath(pathname: string): boolean {
  return (
    pathname === "/framework/artifacts" ||
    pathname.startsWith("/framework/artifacts/new") ||
    pathname === "/framework/artifacts/live"
  );
}

const NAV = [
  { to: "/framework", label: "Overview", icon: Sparkles },
  { to: "/framework/journey", label: "Journey", icon: Sprout },
  { to: "/framework/playbook", label: "Playbook", icon: ClipboardList },
  { to: "/framework/artifacts", label: "Artifacts", icon: FileStack },
  { to: "/framework/library-standing", label: "Library standing", icon: Layers },
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
  immersiveCompactTitle,
  immersiveMobileMinimal,
  immersiveDesktopMinimal,
  headerTrailing,
}: Props) {
  const { pathname } = useLocation();
  const claimResearch = isClaimResearchPath(pathname);
  const immersive = immersiveProp ?? (isArtifactDetailPath(pathname) || claimResearch);
  const studioLibrary = isArtifactsLibraryPath(pathname);
  const compactMobileHeader = Boolean(immersive && (immersiveCompactTitle || immersiveMobileMinimal));
  const hideMobileFrameworkHeader = Boolean(immersiveMobileMinimal);
  const hideDesktopFrameworkHeader = Boolean(immersiveDesktopMinimal);
  const headerMax =
    headerContentClassName ??
    (studioLibrary ? "max-w-[min(92rem,calc(100vw-1.25rem))]" : "max-w-4xl");
  const layoutRootRef = useRef<HTMLDivElement>(null);
  const frameworkHeaderRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!immersiveMobileMinimal) return;
    const root = layoutRootRef.current;
    const header = frameworkHeaderRef.current;
    if (!root) return;

    const sync = () => {
      const pipVideoLayout = window.matchMedia(`(min-width: ${ARTIFACT_VIDEO_PIP_MIN_PX}px)`).matches;
      // Phone + tablet: framework header hidden; pinned video uses top-0 (see ArtifactYoutubeVideoBlock).
      if (!pipVideoLayout) {
        root.style.setProperty("--artifact-header-h", "0px");
        return;
      }
      if (header) {
        const h = header.getBoundingClientRect().height;
        root.style.setProperty("--artifact-header-h", `${Math.max(0, Math.ceil(h))}px`);
      }
    };

    root.style.setProperty("--artifact-sticky-video-h", ARTIFACT_STICKY_VIDEO_H);

    sync();
    const ro = header ? new ResizeObserver(sync) : null;
    if (header) ro?.observe(header);
    const mqlPhone = window.matchMedia(`(max-width: ${ARTIFACT_TABLET_MIN_PX - 1}px)`);
    const mqlDesktop = window.matchMedia(`(min-width: ${ARTIFACT_VIDEO_PIP_MIN_PX}px)`);
    mqlPhone.addEventListener("change", sync);
    mqlDesktop.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      ro?.disconnect();
      mqlPhone.removeEventListener("change", sync);
      mqlDesktop.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [immersiveMobileMinimal]);

  return (
    <div
      ref={layoutRootRef}
      data-artifact-youtube-mobile={immersiveMobileMinimal ? "" : undefined}
      className={cn(
        "min-h-screen bg-background font-sans text-foreground",
        immersiveMobileMinimal &&
          "max-lg:flex max-lg:h-[100dvh] max-lg:max-h-[100dvh] max-lg:flex-col max-lg:overflow-hidden max-lg:[--artifact-header-h:0px] [--artifact-sticky-video-h:56.25vw] [--artifact-sticky-chrome-h:0px] [--artifact-mobile-video-h:56.25vw] [--artifact-mobile-sticky-chrome-h:0px] [--artifact-mobile-pinned-header-h:56.25vw]",
      )}
      style={
        immersiveMobileMinimal
          ? undefined
          : {
              ["--artifact-header-h" as string]: compactMobileHeader ? "3.5rem" : "4.5rem",
              ["--artifact-sticky-video-h" as string]: ARTIFACT_STICKY_VIDEO_H,
            }
      }
    >
      <header
        ref={frameworkHeaderRef}
        data-artifact-framework-header
        className={cn(
          "sticky top-0 z-30 border-b backdrop-blur-md max-md:pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]",
          hideMobileFrameworkHeader && "max-lg:hidden",
          hideDesktopFrameworkHeader && "lg:hidden",
          immersive
            ? "border-border/60 bg-background/92 shadow-sm supports-[backdrop-filter]:bg-background/85"
            : studioLibrary
              ? "border-border/50 bg-background/88 supports-[backdrop-filter]:bg-background/82"
              : "border-border/40 bg-background/85 supports-[backdrop-filter]:bg-background/78",
        )}
      >
        <div
          className={cn(
            "mx-auto px-4 sm:px-5",
            headerLeading && immersive && immersiveCompactTitle
              ? "py-2"
              : headerLeading && immersive
                ? "flex flex-col gap-2 py-2.5 md:flex-row md:items-start md:gap-3 md:py-3.5"
                : "flex items-center gap-2 py-2.5 sm:gap-3 sm:py-3",
            headerMax,
          )}
        >
          {headerLeading && immersive && !immersiveMobileMinimal && (immersiveCompactTitle || headerTrailing) ? (
            <div className="flex items-center gap-2 md:hidden">
              <Link
                to={back ?? "/"}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card/90 text-muted-foreground shadow-sm transition hover:border-border hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Back to artifacts"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
              {immersiveCompactTitle ? (
                <h1 className="min-w-0 flex-1 truncate font-display text-sm font-normal leading-snug text-foreground">
                  {immersiveCompactTitle}
                </h1>
              ) : (
                <div className="min-w-0 flex-1" aria-hidden />
              )}
              {headerTrailing ? <div className="shrink-0">{headerTrailing}</div> : null}
            </div>
          ) : null}

          <div
            className={cn(
              "flex min-w-0 gap-2 sm:gap-3",
              headerLeading &&
                immersive &&
                (immersiveCompactTitle || immersiveMobileMinimal) &&
                "hidden md:flex md:w-full",
              headerLeading && immersive && !immersiveCompactTitle && !immersiveMobileMinimal
                ? "items-start"
                : "flex-1 items-center",
              !(headerLeading && immersive) && "flex-1",
            )}
          >
            <Link
              to={back ?? "/"}
              className={cn(
                "shrink-0 rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                immersive
                  ? "inline-flex items-center gap-1.5 border border-border/60 bg-card/90 px-2.5 py-1.5 text-xs font-medium shadow-sm hover:border-border hover:bg-muted/40 hover:text-foreground"
                  : "inline-flex h-9 w-9 items-center justify-center hover:bg-muted/50 hover:text-foreground",
                headerLeading &&
                  immersive &&
                  (immersiveCompactTitle || immersiveMobileMinimal) &&
                  "hidden md:inline-flex",
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
            {headerActions && !(headerLeading && immersive) ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-1.5">
                {headerActions}
              </div>
            ) : null}
            {studioLibrary && headerTrailing && !immersive ? (
              <div className="shrink-0 md:hidden">{headerTrailing}</div>
            ) : null}
          </div>
          {headerActions && headerLeading && immersive ? (
            <div
              className={cn(
                "flex shrink-0 items-center justify-end gap-1 sm:gap-1.5",
                immersiveCompactTitle || immersiveMobileMinimal ? "hidden md:flex" : "pl-10 md:pl-0",
              )}
            >
              {headerActions}
            </div>
          ) : null}
          {!immersive && (
            <div
              className={cn(
                "flex shrink-0 items-center gap-1 sm:gap-1.5",
                studioLibrary && "hidden md:flex",
              )}
            >
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
          <div
            className={cn(
              "mx-auto px-4 pb-2.5 sm:px-5 sm:pb-3",
              studioLibrary ? "hidden md:block" : "block",
              headerMax,
            )}
          >
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
          immersive
            ? hideMobileFrameworkHeader
              ? "max-lg:mx-0 max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden max-lg:px-0 max-lg:py-0 max-lg:pb-0 lg:mx-0 lg:px-0 lg:py-0 lg:pb-0"
              : hideDesktopFrameworkHeader
                ? "py-4 pb-[calc(1.5rem+var(--safe-area-inset-bottom))] sm:py-6 sm:pb-8 lg:px-0 lg:py-0 lg:pb-0"
                : "py-4 pb-[calc(1.5rem+var(--safe-area-inset-bottom))] sm:py-6 sm:pb-8"
            : studioLibrary
              ? "pt-5 pb-[calc(1.25rem+var(--safe-area-inset-bottom))] sm:py-6"
              : "pt-8 pb-[calc(2rem+var(--safe-area-inset-bottom))] sm:py-10",
          contentClassName ?? "max-w-4xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
