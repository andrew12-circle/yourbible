import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { LifeWeeksPanel } from "@/components/life/LifeWeeksPanel";
import { Button } from "@/components/ui/button";
export default function LifeWeeksPage() {
  const { user, loading } = useAuth();
  const { showHubShell } = useAppShellMode();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (showHubShell) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background pb-safe-16">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-background/80 px-3 py-3 backdrop-blur-md sm:px-4">
        <Button variant="ghost" size="icon" asChild className="-ml-1 shrink-0" aria-label="Back">
          <Link to="/home">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold tracking-tight">My life in weeks</h1>
      </header>
      <LifeWeeksPanel />
    </div>
  );
}
