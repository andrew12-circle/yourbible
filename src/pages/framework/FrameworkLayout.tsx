import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { warmYouTubeIframeApi } from "@/lib/youtube/warmEmbed";
import {
  ARTIFACT_TABLET_MIN_PX,
  ARTIFACT_VIDEO_PIP_MIN_PX,
} from "@/lib/framework/artifactSurfaces";
import { ARTIFACT_STICKY_VIDEO_H } from "@/lib/framework/artifactLayoutCss";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import AiWritingAssistToggle from "@/components/writing/AiWritingAssistToggle";
import { useAppShellMode } from "@/hooks/useAppShellMode";

interface Props {
  children: ReactNode;
  title?: string;
  back?: string;
  /** Optional main width; defaults to full inset width (`max-w-none`). */
  contentClassName?: string;
  /** Optional header row max-width; defaults to full inset width. Use with a wide `contentClassName` so the sticky header aligns with the page. */
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
    pathname.startsWith("/framework/artifacts/new")
  );
}

/** Full-area tool surfaces (graph, chat, live capture) — fill hub inset, minimal chrome padding. */
export function isFrameworkWorkspacePath(pathname: string): boolean {
  return (
    pathname === "/framework/graph" ||
    pathname === "/framework/graph/beliefs" ||
    pathname === "/framework/chat" ||
    pathname === "/framework/artifacts/live"
  );
}

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
  const { showHubShell } = useAppShellMode();
  const claimResearch = isClaimResearchPath(pathname);
  const immersive = immersiveProp ?? (isArtifactDetailPath(pathname) || claimResearch);
  const studioLibrary = isArtifactsLibraryPath(pathname);
  const workspace = isFrameworkWorkspacePath(pathname);
  const compactMobileHeader = Boolean(immersive && (immersiveCompactTitle || immersiveMobileMinimal));
  const hideMobileFrameworkHeader = Boolean(immersiveMobileMinimal);
  const hideDesktopFrameworkHeader = Boolean(immersiveDesktopMinimal);
  const headerMax = headerContentClassName ?? "max-w-none";
  const hideHubRootBack = showHubShell && pathname === "/framework";
  const compactHubHeader = showHubShell && !immersive && !workspace;
  const layoutRootRef = useRef<HTMLDivElement>(null);
  const frameworkHeaderRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isArtifactDetailPath(pathname) || isArtifactsLibraryPath(pathname)) {
      warmYouTubeIframeApi();
    }
  }, [pathname]);

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
        "bg-background font-sans text-foreground",
        workspace || showHubShell
          ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden"
          : "min-h-screen",
        immersiveMobileMinimal &&
          (showHubShell
            ? "flex h-full min-h-0 flex-col overflow-hidden [--artifact-header-h:0px] [--artifact-sticky-video-h:56.25vw] [--artifact-sticky-chrome-h:0px] [--artifact-mobile-video-h:56.25vw] [--artifact-mobile-sticky-chrome-h:0px] [--artifact-mobile-pinned-header-h:56.25vw]"
            : "max-lg:flex max-lg:h-[100svh] max-lg:max-h-[100svh] max-lg:flex-col max-lg:overflow-hidden max-lg:[--artifact-header-h:0px] [--artifact-sticky-video-h:56.25vw] [--artifact-sticky-chrome-h:0px] [--artifact-mobile-video-h:56.25vw] [--artifact-mobile-sticky-chrome-h:0px] [--artifact-mobile-pinned-header-h:56.25vw]"),
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
          "sticky top-0 z-30 shrink-0 border-b backdrop-blur-md max-md:pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]",
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
            {!hideHubRootBack ? (
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
            ) : null}
            <div className="min-w-0 flex-1">
              {headerLeading ? (
                headerLeading
              ) : title ? (
                <h1
                  className={cn(
                    "truncate font-display tracking-tight text-foreground",
                    compactHubHeader
                      ? "text-base font-medium sm:text-lg"
                      : "text-xl font-normal sm:text-2xl",
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
      </header>
      <main
        className={cn(
          "mx-auto px-4 sm:px-5",
          showHubShell && !workspace && !immersive && "min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
          immersive
            ? hideMobileFrameworkHeader
              ? showHubShell
                ? "mx-0 flex min-h-0 flex-1 flex-col overflow-hidden px-0 py-0 pb-0"
                : "max-lg:mx-0 max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden max-lg:px-0 max-lg:py-0 max-lg:pb-0 lg:mx-0 lg:px-0 lg:py-0 lg:pb-0"
              : hideDesktopFrameworkHeader
                ? "py-4 pb-[calc(1.5rem+var(--safe-area-inset-bottom))] sm:py-6 sm:pb-8 lg:px-0 lg:py-0 lg:pb-0"
                : "py-4 pb-[calc(1.5rem+var(--safe-area-inset-bottom))] sm:py-6 sm:pb-8"
            : workspace
              ? "mx-0 w-full min-w-0 flex min-h-0 flex-1 flex-col px-0 pb-0 pt-0"
              : studioLibrary
                ? showHubShell
                  ? "min-h-0 flex-1 overflow-y-auto pt-4 pb-4 sm:py-5"
                  : "pt-5 pb-[calc(1.25rem+var(--safe-area-inset-bottom))] sm:py-6"
                : showHubShell
                  ? "min-h-0 flex-1 overflow-y-auto py-4 sm:py-6"
                  : "pt-8 pb-[calc(2rem+var(--safe-area-inset-bottom))] sm:py-10",
          contentClassName ?? "max-w-none",
        )}
      >
        {children}
      </main>
    </div>
  );
}
