import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import IosHomePage from "@/pages/home/IosHomePage";
import HubHomePage from "@/pages/home/HubHomePage";
import { BetaWelcomeBanner } from "@/components/home/BetaWelcomeBanner";
import { shouldShowBetaWelcome } from "@/lib/beta/welcome";
import { mobileCenteredScreen } from "@/lib/shell/mobileShellClasses";

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const [showWelcome, setShowWelcome] = useState(shouldShowBetaWelcome);

  if (loading) {
    return (
      <div className={mobileCenteredScreen()}>
        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;

  const home = showHubShell ? <HubHomePage /> : <IosHomePage />;

  if (!showWelcome) return home;

  return (
    <>
      <BetaWelcomeBanner onDismiss={() => setShowWelcome(false)} />
      {home}
    </>
  );
}
