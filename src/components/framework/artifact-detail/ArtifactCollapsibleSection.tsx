import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsDesktop } from "@/hooks/use-desktop";
import { artifactScrollMt } from "@/lib/framework/artifactSurfaces";
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
  const isDesktop = useIsDesktop();
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

  return (
    <Collapsible
      id={id}
      open={open}
      onOpenChange={onOpenChange}
      className={cn(artifactScrollMt, "mb-4", className)}
    >
      <CollapsibleTrigger
        id={triggerId}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-left shadow-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0">
          <span className="font-display text-sm text-foreground sm:text-base">{title}</span>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
