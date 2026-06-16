import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { HubShellSkeleton } from "@/components/shell/HubShellSkeleton";

const HubShell = lazy(() =>
  import("@/components/shell/HubShell").then((mod) => ({ default: mod.HubShell })),
);

/** Layout route: hub shell when homeMode is hub; otherwise passthrough. */
export function ShellGate() {
  const { showHubShell } = useAppShellMode();

  if (showHubShell) {
    return (
      <Suspense fallback={<HubShellSkeleton />}>
        <HubShell>
          <Outlet />
        </HubShell>
      </Suspense>
    );
  }

  return <Outlet />;
}
