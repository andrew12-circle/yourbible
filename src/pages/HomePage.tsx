import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import IosHomePage from "@/pages/home/IosHomePage";
import HubHomePage from "@/pages/home/HubHomePage";

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const { showHubShell } = useAppShellMode();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;

  return showHubShell ? <HubHomePage /> : <IosHomePage />;
}
