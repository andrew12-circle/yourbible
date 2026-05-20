import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { formatClaimVerdict } from "@/lib/framework/claimVerdict";

interface DeferredClaimRow {
  id: string;
  claim: string;
  verdict: string | null;
  deferred_at: string | null;
  created_at: string;
  artifact_id: string;
  artifacts: { id: string; title: string | null } | null;
}

export default function ResearchLaterPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<DeferredClaimRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from("artifact_claims")
        .select("id,claim,verdict,deferred_at,created_at,artifact_id,artifacts(id,title)")
        .eq("user_id", user.id)
        .eq("verdict", "defer")
        .order("deferred_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error) setRows((data as unknown as DeferredClaimRow[]) ?? []);
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const clearDefer = async (claimId: string) => {
    await supabase
      .from("artifact_claims")
      .update({ verdict: null, deferred_at: null })
      .eq("id", claimId);
    setRows((current) => current.filter((r) => r.id !== claimId));
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Research later" back="/framework/artifacts">
      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
        Claims you marked <span className="font-medium text-foreground">Defer</span> or{" "}
        <span className="font-medium text-foreground">Research later</span> on artifact pages. Each entry links back to
        the artifact so you can pick up where you left off.
      </p>

      {fetching ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading queue…
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />
          <p>Nothing in your research queue yet.</p>
          <p className="mt-2">
            On an artifact&apos;s claim cards, use <span className="font-medium text-foreground">Research later</span> or{" "}
            <span className="font-medium text-foreground">Defer</span> when you want to return later.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/framework/artifacts">Browse artifacts</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{formatClaimVerdict(row.verdict)}</span>
                {row.deferred_at ? (
                  <>
                    <span aria-hidden>·</span>
                    <time dateTime={row.deferred_at}>
                      {new Date(row.deferred_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </>
                ) : null}
              </div>
              <p className="font-medium leading-snug text-foreground">{row.claim}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                From{" "}
                <Link
                  to={`/framework/artifacts/${row.artifact_id}`}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {row.artifacts?.title?.trim() || "Untitled artifact"}
                </Link>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link to={`/framework/artifacts/${row.artifact_id}#${row.id}`}>Open claim</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => void clearDefer(row.id)}>
                  Remove from queue
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FrameworkLayout>
  );
}
