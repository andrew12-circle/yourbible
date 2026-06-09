import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HubContentSkeleton } from "@/components/shell/HubContentSkeleton";

export function HubShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="hub-shell flex min-h-svh bg-muted/40 bg-fabric">
      <aside
        className="hidden shrink-0 md:block"
        style={{ width: "calc(var(--sidebar-width, 16rem) + var(--hub-edge, 0.75rem))" }}
      >
        <div
          className="flex flex-col rounded-xl border border-border/30 bg-background p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          style={{
            height: "var(--hub-card-height)",
            marginTop: "var(--hub-safe-top)",
            marginLeft: "var(--hub-edge)",
            marginBottom: "var(--hub-edge)",
          }}
        >
          <div className="mb-6 flex items-center gap-2 px-1">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>
      </aside>
      <div className="hub-content-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/30 bg-background shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <header className="flex h-11 shrink-0 items-center justify-end border-b border-border/30 px-3">
          <Skeleton className="h-8 w-8 rounded-full" />
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children ?? <HubContentSkeleton />}
        </div>
      </div>
    </div>
  );
}
