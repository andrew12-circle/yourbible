import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const deleteArtifact = async (id: string, title: string | null) => {
    const confirmed = window.confirm(`Delete artifact "${title || "Untitled"}"? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(id);
    const { error } = await supabase
      .from("artifacts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      setDeletingId(null);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
    toast({ title: "Artifact deleted" });
  };

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
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <Link to={`/framework/artifacts/${r.id}`} className="block hover:underline underline-offset-2">
                    <div className="truncate font-medium">{r.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.kind} · {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                </div>
                <div className="flex items-center gap-3 pl-3">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.status}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === r.id}
                    onClick={() => deleteArtifact(r.id, r.title)}
                    aria-label={`Delete ${r.title || "Untitled"}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FrameworkLayout>
  );
}
