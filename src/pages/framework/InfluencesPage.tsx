import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";

interface SourceRow {
  id: string;
  belief_id: string;
  source_type: string;
  label: string;
}
interface BeliefRow {
  id: string;
  topic: string;
  statement: string;
  layer: string;
  confidence: number;
}

export default function InfluencesPage() {
  const { user, loading } = useAuth();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [beliefs, setBeliefs] = useState<Record<string, BeliefRow>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: s }, { data: b }] = await Promise.all([
        supabase
          .from("belief_sources")
          .select("id,belief_id,source_type,label")
          .eq("user_id", user.id),
        supabase
          .from("belief_nodes")
          .select("id,topic,statement,layer,confidence")
          .eq("user_id", user.id),
      ]);
      setSources((s as SourceRow[]) ?? []);
      const map: Record<string, BeliefRow> = {};
      for (const x of (b as BeliefRow[]) ?? []) map[x.id] = x;
      setBeliefs(map);
    })();
  }, [user]);

  const grouped = useMemo(() => {
    const m = new Map<string, { type: string; label: string; beliefs: string[] }>();
    for (const s of sources) {
      const key = `${s.source_type}::${s.label.toLowerCase()}`;
      if (!m.has(key)) m.set(key, { type: s.source_type, label: s.label, beliefs: [] });
      m.get(key)!.beliefs.push(s.belief_id);
    }
    return Array.from(m.values()).sort((a, b) => b.beliefs.length - a.beliefs.length);
  }, [sources]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Influences" back="/framework">
      <p className="text-sm text-muted-foreground mb-5 max-w-prose">
        Who and what shaped your beliefs. Add sources from any belief's detail
        page — mentors, denominations, books, podcasts, scripture, lived
        experience.
      </p>
      {grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Users className="w-5 h-5 mx-auto mb-2 opacity-60" />
          No influences logged yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {grouped.map((g) => (
            <li
              key={`${g.type}-${g.label}`}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {g.type}
                  </div>
                  <div className="font-display text-lg leading-tight">{g.label}</div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {g.beliefs.length} {g.beliefs.length === 1 ? "belief" : "beliefs"}
                </span>
              </div>
              <ul className="divide-y divide-border/60 text-sm">
                {g.beliefs.map((bid) => {
                  const b = beliefs[bid];
                  if (!b) return null;
                  return (
                    <li key={bid}>
                      <Link
                        to={`/framework/beliefs/${bid}`}
                        className="block py-2 hover:text-foreground text-muted-foreground"
                      >
                        <span className="text-foreground">{b.topic}</span>
                        <span className="mx-2 opacity-50">·</span>
                        <span className="text-xs">{b.statement.slice(0, 90)}{b.statement.length > 90 ? "…" : ""}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </FrameworkLayout>
  );
}