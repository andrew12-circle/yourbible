import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type EarlierFinding = {
  id: string;
  claim: string;
  verdict: string | null;
  user_note: string | null;
  source_quote: string | null;
};
const PAGE_SIZE = 30;

/** Key the private state by both identities so account or artifact changes never reuse it. */
export default function ArtifactFindingHistory({ artifactId }: { artifactId: string }) {
  const userId = useContext(AuthContext)?.user?.id;
  return userId ? <FindingHistory key={`${userId}:${artifactId}`} artifactId={artifactId} userId={userId} /> : null;
}

function FindingHistory({ artifactId, userId }: { artifactId: string; userId: string }) {
  const [rows, setRows] = useState<EarlierFinding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const attemptedInitialLoad = useRef(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);

  const load = async (append = false) => {
    if (pending.current) return;
    pending.current = true;
    attemptedInitialLoad.current = true;
    const request = ++generation.current;
    setBusy(true);
    setError(null);
    const offset = append ? rows.length : 0;
    try {
      const result = await supabase.from("artifact_claims")
        .select("id,claim,verdict,user_note,source_quote")
        .eq("artifact_id", artifactId).eq("user_id", userId)
        .not("retired_at", "is", null)
        .order("retired_at", { ascending: false }).order("id")
        .range(offset, offset + PAGE_SIZE - 1);
      if (request !== generation.current) return;
      if (result.error) throw new Error("Could not load earlier findings. Your saved research is unchanged.");
      const next = (result.data ?? []) as unknown as EarlierFinding[];
      setRows(previous => append ? [...previous, ...next] : next);
      setMore(next.length === PAGE_SIZE);
      setLoaded(true);
    } catch (failure) {
      if (request === generation.current) {
        setError(failure instanceof Error ? failure.message : "Connection interrupted. Try again.");
      }
    } finally {
      if (request === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <details className="mb-4 rounded-xl border border-border/70 p-3 text-sm"
      onToggle={event => { if (event.currentTarget.open && !attemptedInitialLoad.current) void load(); }}>
      <summary className="cursor-pointer font-medium">Earlier findings and saved research</summary>
      <p className="mt-2 text-muted-foreground">
        These findings were replaced by a newer analysis. Their verdicts, notes, and research remain available.
      </p>
      {rows.map(row => (
        <article key={row.id} className="mt-3 border-t border-border/60 pt-3">
          <p>{row.claim}</p>
          {row.verdict ? <p className="mt-1">Your verdict: {row.verdict}</p> : null}
          {row.user_note ? <p className="mt-1 whitespace-pre-wrap">{row.user_note}</p> : null}
          {row.source_quote ? <blockquote className="mt-2 border-l-2 pl-3 text-muted-foreground">{row.source_quote}</blockquote> : null}
          <Link className="mt-2 inline-block underline" to={`/framework/artifacts/${artifactId}/research/${row.id}`}>Open saved research</Link>
        </article>
      ))}
      {error ? <p role="alert" className="mt-2">{error} <Button type="button" variant="link" onClick={() => void load(loaded && rows.length > 0)}>Retry</Button></p> : null}
      {busy ? <p role="status" className="mt-2">Loading earlier findings…</p> : null}
      {loaded && !rows.length ? <p className="mt-2 text-muted-foreground">No earlier findings.</p> : null}
      {more && !busy ? <Button type="button" variant="outline" className="mt-2" onClick={() => void load(true)}>Load more</Button> : null}
    </details>
  );
}
