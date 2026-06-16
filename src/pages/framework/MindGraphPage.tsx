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

  const mobileMenuExtra = (
    <Button variant="outline" className="w-full justify-start text-sm" asChild>
      <Link to="/framework/graph/beliefs">Belief graph tools</Link>
    </Button>
  );

  return (
    <FrameworkLayout
      title="Mind map"
      back="/framework"
      contentClassName="max-w-none w-full min-w-0 flex min-h-0 flex-1 flex-col px-0 pb-0 pt-2 sm:pt-3"
      headerContentClassName="max-w-none"
      headerActions={
        <Button variant="ghost" size="sm" className="hidden text-[12px] md:inline-flex" asChild>
          <Link to="/framework/graph/beliefs">Belief graph tools</Link>
        </Button>
      }
    >
      <MindGraphView fill className="min-h-0 flex-1" menuExtra={mobileMenuExtra} />
    </FrameworkLayout>
  );
}
