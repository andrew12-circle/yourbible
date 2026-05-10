import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Belief {
  id: string;
  topic: string;
  statement: string;
  layer: string;
}
interface Tension {
  id: string;
  a_id: string;
  b_id: string;
  severity: number;
  summary: string;
  explanation: string | null;
  suggested_resolution: string | null;
  status: string;
  created_at: string;
}

function severityTone(s: number) {
  if (s >= 75) return "hsl(0 65% 55%)";
  if (s >= 50) return "hsl(30 80% 55%)";
  return "hsl(45 70% 50%)";
}

export default function TensionsPage() {
  const { user, loading } = useAuth();
  const [tensions, setTensions] = useState<Tension[]>([]);
  const [beliefs, setBeliefs] = useState<Record<string, Belief>>({});
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = async () => {
    if (!user) return;
    const [{ data: t }, { data: b }] = await Promise.all([
      supabase
        .from("belief_tensions")
        .select("*")
        .eq("user_id", user.id)
        .order("severity", { ascending: false }),
      supabase
        .from("belief_nodes")
        .select("id,topic,statement,layer")
        .eq("user_id", user.id),
    ]);
    setTensions((t as Tension[]) ?? []);
    const map: Record<string, Belief> = {};
    for (const x of (b as Belief[]) ?? []) map[x.id] = x;
    setBeliefs(map);
  };

  useEffect(() => {
    load();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const runScan = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("framework-detect-tensions");
    setBusy(false);
    if (error) {
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tension scan complete" });
      load();
    }
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("belief_tensions").update({ status }).eq("id", id);
    setTensions((arr) => arr.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  const visible = tensions.filter((t) => (filter === "open" ? t.status === "open" : true));

  return (
    <FrameworkLayout title="Tensions" back="/framework">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-prose">
          AI-flagged tensions between beliefs you hold. Use them as prompts for
          deeper study, not verdicts.
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
            <button
              onClick={() => setFilter("open")}
              className={`px-2.5 py-1 ${filter === "open" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Open
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 ${filter === "all" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              All
            </button>
          </div>
          <Button size="sm" onClick={runScan} disabled={busy}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Scanning…" : "Run scan"}
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 opacity-60" />
          {tensions.length === 0
            ? "No tensions detected yet. Run a scan to look for contradictions across your beliefs."
            : "No open tensions. Switch to All to see resolved or dismissed ones."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((t) => {
            const a = beliefs[t.a_id];
            const b = beliefs[t.b_id];
            return (
              <li
                key={t.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: `${severityTone(t.severity)}22`, color: severityTone(t.severity) }}
                    >
                      Severity {t.severity}
                    </span>
                    {t.status !== "open" && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t.status}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, "resolved")} title="Mark resolved">
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, "dismissed")} title="Dismiss">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="font-medium mb-2">{t.summary}</div>
                <div className="grid sm:grid-cols-2 gap-2 mb-3">
                  {[a, b].map((x, i) =>
                    x ? (
                      <Link
                        key={i}
                        to={`/framework/beliefs/${x.id}`}
                        className="block rounded border border-border bg-background/50 p-2 text-xs hover:bg-muted"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          {x.topic}
                        </div>
                        <div className="line-clamp-3">{x.statement}</div>
                      </Link>
                    ) : (
                      <div key={i} className="text-xs text-muted-foreground italic p-2">
                        Belief deleted
                      </div>
                    ),
                  )}
                </div>
                {t.explanation && (
                  <p className="text-sm text-muted-foreground mb-2">{t.explanation}</p>
                )}
                {t.suggested_resolution && (
                  <p className="text-sm">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                      Try
                    </span>
                    {t.suggested_resolution}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </FrameworkLayout>
  );
}