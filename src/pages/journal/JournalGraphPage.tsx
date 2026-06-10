import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import MindGraphView from "@/components/graph/MindGraphView";

/** Journal-scoped slice of the unified mind graph. */
export default function JournalGraphPage() {
  const { user, loading } = useAuth();
  const { journalId: paramJournalId } = useParams<{ journalId?: string }>();
  const journalId = paramJournalId ?? null;

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalShell journalId={journalId} activeTab="graph">
      <div className="flex min-h-[calc(100svh-14rem)] flex-col px-3 pb-4">
        <MindGraphView journalId={journalId} fill className="min-h-0 flex-1" />
      </div>
    </JournalShell>
  );
}
