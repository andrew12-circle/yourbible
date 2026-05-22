import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import { useArtifactLayoutMode } from "@/hooks/useArtifactLayoutMode";
import {
  artifactScrollMt,
  artifactScrollMtMobile,
  artifactScrollMtMobilePane,
  artifactStudySectionContentMobile,
} from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  description?: string;
  /** Shown beside title on mobile (e.g. claim count). */
  count?: number | string;
  countLabel?: string;
  /** Open by default below lg. */
  defaultOpenMobile?: boolean;
  /** Open by default at lg+. */
  defaultOpenDesktop?: boolean;
  /** Persist open state per artifact when set. */
  storageKey?: string;
  /** Controlled open (e.g. open capture from quick row). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Phone YouTube: video is pinned above the scroll pane; use in-pane scroll margin. */
  pinnedVideoPane?: boolean;
  children: ReactNode;
};

function readStoredOpen(key: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

export default function ArtifactCollapsibleSection({
  id,
  title,
  description,
  count,
  countLabel,
  defaultOpenMobile = false,
  defaultOpenDesktop = true,
  storageKey,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  className,
  pinnedVideoPane = false,
  children,
}: Props) {
  const layoutMode = useArtifactLayoutMode();
  const isDesktop = layoutMode === "desktop";
  const triggerId = useId();
  const defaultOpen = isDesktop ? defaultOpenDesktop : defaultOpenMobile;
  const [openInternal, setOpenInternal] = useState(() => {
    if (storageKey) {
      const stored = readStoredOpen(storageKey);
      if (stored != null) return stored;
    }
    return defaultOpen;
  });

  const open = openProp ?? openInternal;

  useEffect(() => {
    if (storageKey || openProp != null) return;
    setOpenInternal(isDesktop ? defaultOpenDesktop : defaultOpenMobile);
  }, [isDesktop, defaultOpenDesktop, defaultOpenMobile, storageKey, openProp]);

  const onOpenChange = (next: boolean) => {
    onOpenChangeProp?.(next);
    if (openProp == null) setOpenInternal(next);
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
  };

  const scrollMt =
    layoutMode === "phone"
      ? pinnedVideoPane
        ? artifactScrollMtMobilePane
        : artifactScrollMtMobile
      : artifactScrollMt;

  return (
    <Collapsible
      id={id}
      open={open}
      onOpenChange={onOpenChange}
      className={cn(scrollMt, isDesktop ? "mb-4" : "mb-0", className)}
    >
      <CollapsibleTrigger
        id={triggerId}
        className={cn(
          "flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDesktop
            ? "min-h-0 justify-between border-b border-border/40 py-3 transition hover:bg-muted/20"
            : "min-h-0 justify-between py-1",
        )}
      >
        <ArtifactStudySectionHeader
          title={title}
          description={isDesktop ? undefined : description}
          count={count}
          countLabel={countLabel}
        />
        <ChevronDown
          className={cn(
            "shrink-0 text-muted-foreground/80 transition-transform",
            isDesktop ? "h-4 w-4" : "h-4 w-4 mt-1",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={isDesktop ? "pt-3" : artifactStudySectionContentMobile}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
