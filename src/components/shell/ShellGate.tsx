import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { Skeleton } from "@/components/ui/skeleton";

const HubShell = lazy(() =>
  import("@/components/shell/HubShell").then((mod) => ({ default: mod.HubShell })),
);

function HubShellFallback() {
  return (
    <div className="flex h-dvh items-center justify-center bg-muted/40 bg-fabric">
      <Skeleton className="h-10 w-48" />
    </div>
  );
}

/** Layout route: hub shell on desktop when homeMode is hub; otherwise passthrough. */
export function ShellGate() {
  const { showHubShell } = useAppShellMode();

  if (showHubShell) {
    return (
      <Suspense fallback={<HubShellFallback />}>
        <HubShell>
          <Outlet />
        </HubShell>
      </Suspense>
    );
  }

  return <Outlet />;
}
