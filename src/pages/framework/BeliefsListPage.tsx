import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_LAYERS, LAYER_META } from "@/data/framework";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import QuickBeliefDialog from "@/components/framework/QuickBeliefDialog";

interface BeliefRow {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
  updated_at: string;
}

export default function BeliefsListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<BeliefRow[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("belief_nodes")
      .select("id,layer,topic,statement,answer,confidence,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setRows((data as BeliefRow[]) ?? []);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="All beliefs" back="/framework">
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add belief
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No beliefs yet. Start with the{" "}
          <Link className="underline" to="/framework">interview</Link>, or tap{" "}
          <button className="underline" onClick={() => setOpen(true)}>Add belief</button>{" "}
          to drop a quick "I believe…" statement.
        </p>
      ) : (
        <div className="space-y-6">
          {ALL_LAYERS.map((layer) => {
            const layerRows = rows.filter((r) => r.layer === layer);
            if (layerRows.length === 0) return null;
            const meta = LAYER_META[layer];
            return (
              <section key={layer}>
                <h2
                  className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-2"
                  style={{ color: meta.tone }}
                >
                  {meta.title}
                </h2>
                <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {layerRows.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={`/framework/beliefs/${r.id}`}
                        className="block px-4 py-3 hover:bg-muted"
                      >
                        <div className="text-xs text-muted-foreground mb-0.5">{r.topic}</div>
                        <div className="font-medium text-sm leading-snug mb-1 line-clamp-2">
                          {r.statement}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">{r.confidence}%</span>
                          <span className="truncate">{r.answer || "—"}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </FrameworkLayout>
  );
}