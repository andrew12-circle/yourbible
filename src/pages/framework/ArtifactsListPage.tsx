import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";

interface Row {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  created_at: string;
}

export default function ArtifactsListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("artifacts")
        .select("id,title,kind,status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data as Row[]) ?? []);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Artifacts" back="/framework">
      <div className="mb-4">
        <Button asChild size="sm">
          <Link to="/framework/artifacts/new"><Plus className="w-4 h-4 mr-1" /> New artifact</Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No artifacts yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={`/framework/artifacts/${r.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.kind} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </FrameworkLayout>
  );
}