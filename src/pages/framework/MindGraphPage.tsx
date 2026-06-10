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
      contentClassName="max-w-none px-0 pb-0"
      headerContentClassName="max-w-none"
      headerActions={
        <Button variant="ghost" size="sm" className="text-[12px]" asChild>
          <Link to="/framework/graph/beliefs">Belief graph tools</Link>
        </Button>
      }
    >
      <div className="px-3 pb-6 pt-2 md:px-4">
        <MindGraphView />
      </div>
    </FrameworkLayout>
  );
}
