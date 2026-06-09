import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-texture">
        <Loader2 className="w-6 h-6 animate-spin text-leather/50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/home" replace />;
};

export default Index;
