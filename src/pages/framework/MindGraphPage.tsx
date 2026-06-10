import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import MindGraphView from "@/components/graph/MindGraphView";
import { Button } from "@/components/ui/button";

/** Unified mind graph — journals, artifacts, beliefs, people, scripture. */
export default function MindGraphPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout
      title="Mind map"
      back="/framework"
      contentClassName="max-w-none flex min-h-0 flex-1 flex-col px-2 pb-2 pt-2 sm:px-3 sm:pb-3"
      headerContentClassName="max-w-none"
      headerActions={
        <Button variant="ghost" size="sm" className="text-[12px]" asChild>
          <Link to="/framework/graph/beliefs">Belief graph tools</Link>
        </Button>
      }
    >
      <MindGraphView fill className="min-h-0 flex-1" />
    </FrameworkLayout>
  );
}
