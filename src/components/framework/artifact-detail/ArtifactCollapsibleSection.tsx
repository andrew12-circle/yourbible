import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useArtifactLayoutMode } from "@/hooks/useArtifactLayoutMode";
import {
  artifactScrollMt,
  artifactScrollMtMobile,
  artifactStudySectionContentMobile,
  artifactStudySectionTriggerMobile,
} from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  description?: string;
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
  defaultOpenMobile = false,
  defaultOpenDesktop = true,
  storageKey,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  className,
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

  const scrollMt = layoutMode === "phone" ? artifactScrollMtMobile : artifactScrollMt;

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
          isDesktop
            ? "flex w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-left shadow-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            : cn(artifactStudySectionTriggerMobile, open && "bg-muted/15"),
        )}
      >
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "font-display text-foreground",
              isDesktop ? "text-sm sm:text-base" : "text-[15px] font-semibold leading-snug tracking-tight",
            )}
          >
            {title}
          </span>
          {description ? (
            <p
              className={cn(
                "text-muted-foreground",
                isDesktop
                  ? "mt-0.5 line-clamp-2 text-xs"
                  : open
                    ? "mt-1 line-clamp-3 text-xs leading-relaxed"
                    : "mt-0.5 line-clamp-1 text-[11px] leading-snug",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            isDesktop ? "h-4 w-4" : "h-5 w-5",
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
