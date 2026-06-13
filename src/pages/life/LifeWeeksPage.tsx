import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { LifeWeeksPanel } from "@/components/life/LifeWeeksPanel";
import MobilePageShell from "@/components/shell/MobilePageShell";
import { Button } from "@/components/ui/button";
import { mobileCenteredScreen } from "@/lib/shell/mobileShellClasses";

export default function LifeWeeksPage() {
  const { user, loading } = useAuth();
  const { showHubShell } = useAppShellMode();

  if (loading) {
    return (
      <div className={mobileCenteredScreen("bg-background")}>
        <Loader2 className="h-6 w-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (showHubShell) return <Navigate to="/home" replace />;

  return (
    <MobilePageShell
      mainPaddingBottom="pb-safe-16"
      headerClassName="flex items-center gap-2 border-border/60 bg-background/80 px-3 py-3 sm:px-4"
      header={
        <>
          <Button variant="ghost" size="icon" asChild className="-ml-1 h-9 w-9 shrink-0" aria-label="Back">
            <Link to="/home">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-base font-semibold tracking-tight">My life in weeks</h1>
        </>
      }
    >
      <LifeWeeksPanel />
    </MobilePageShell>
  );
}
