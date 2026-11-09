import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import { JournalVaultUnlockGate } from "@/components/journal/JournalVaultUnlockGate";
import { BeStillExperience } from "@/components/prayer/BeStillExperience";
import { MORNING_FORMULA_CONVERSATION_RETURN } from "@/lib/bible/readerNavigation";

export default function BeStillPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const entryPoint = params.get("from") === "morning" ? "morning" : "prayer";
  const back = entryPoint === "morning" ? MORNING_FORMULA_CONVERSATION_RETURN : "/prayer";

  if (loading) return <p role="status" className="p-6 text-muted-foreground">Opening your quiet space…</p>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PrayerShell title="Be Still" back={back} backLabel={entryPoint === "morning" ? "Return to Morning Formula" : "Back to prayer"} hideTabs>
      <JournalVaultUnlockGate>
        <BeStillExperience key={`${user.id}:${params.get("session") ?? "active"}`} userId={user.id} entryPoint={entryPoint} resumeId={params.get("session") ?? undefined} />
      </JournalVaultUnlockGate>
    </PrayerShell>
  );
}
