import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { MorningFormulaHub } from "@/components/living-hope/MorningFormulaHub";
import { useLivingHope } from "@/hooks/useLivingHope";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

export default function LivingHopeHubPage() {
  const { user, loading } = useAuth();
  const { busy, letter, goals, todayReview, streak } = useLivingHope(user?.id);
  const { busy: wbBusy, workbook } = useLivingHopeWorkbook(user?.id);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const loadingAll = busy || wbBusy;

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <LivingHopeChrome hubLanding>
      {loadingAll ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className={cn("w-6 h-6 animate-spin", lh.spinner)} />
        </div>
      ) : (
        <MorningFormulaHub
          workbook={workbook}
          letter={letter}
          goals={goals}
          todayReview={todayReview}
          streak={streak}
          greeting={greeting}
        />
      )}
    </LivingHopeChrome>
  );
}
