import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HubContentSkeleton } from "@/components/shell/HubContentSkeleton";

export function HubShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="hub-shell flex min-h-svh">
      <aside
        className="hidden shrink-0 md:block"
        style={{ width: "calc(var(--sidebar-width, 16rem) + var(--hub-edge, 0.75rem))" }}
      >
        <div
          className="flex flex-col rounded-xl border border-border/30 bg-background shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          style={{
            height: "var(--hub-card-height)",
            marginTop: "var(--hub-safe-top)",
            marginLeft: "var(--hub-edge)",
            marginBottom: "var(--hub-edge)",
          }}
        >
          <div className="flex flex-1 flex-col overflow-hidden p-4 pb-0">
            <div className="mb-6 flex items-center gap-3.5 px-1">
              <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-8 w-[5.25rem] rounded-md" />
                <Skeleton className="h-2.5 w-24 rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          </div>
          <div className="mt-auto shrink-0 border-t border-border/40 px-2 py-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-border/40 px-2.5 py-2">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="hub-content-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/30 bg-background shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children ?? <HubContentSkeleton />}
        </div>
      </div>
    </div>
  );
}
