import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { journalNewEntryEditHref } from "@/lib/journal/entryNavigation";
import { extractHeartNote, extractWorshipNote, syncHeartToConversationEntry, syncWorshipToConversationEntry } from "@/lib/livingHope/morningConversationJournal";
import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Section = "worship" | "heart";
type Props = { entryId: string | null; busy: boolean; error: string | null; section: Section; returnTo: string; className?: string };
const queues = new Map<string, Promise<void>>();

export function MorningFormulaInlineJournal({ entryId, busy, error, section, returnTo, className }: Props) {
  const { user, profile } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const change = useRef<(value: string) => void>(() => undefined);
  const flush = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!entryId || !user?.id) { setReady(false); return; }
    if (!profile || profile.user_id !== user.id || profile.journal_e2e_enabled) {
      setReady(false); setLoading(false);
      setSaveError("Open the full journal to unlock private writing.");
      return;
    }
    const userId = user.id;
    const key = `yb-morning-inline:${userId}:${entryId}:${section}`;
    let active = true;
    let dirty = false;
    let current = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let revision = 0;
    let submitted = -1;
    setReady(false); setLoading(true); setSaveError(null);
    const save = () => {
      clearTimeout(timer);
      if (!dirty || submitted === revision) return;
      const snapshot = current;
      const submittedRevision = revision;
      submitted = submittedRevision;
      const previous = queues.get(key) ?? Promise.resolve();
      const request = previous.catch(() => undefined).then(() => section === "worship"
        ? syncWorshipToConversationEntry(userId, entryId, snapshot)
        : syncHeartToConversationEntry(userId, entryId, snapshot));
      queues.set(key, request);
      void request.then(() => {
        try { if (sessionStorage.getItem(key) === JSON.stringify(snapshot)) sessionStorage.removeItem(key); } catch { /* Optional device recovery cache. */ }
        if (revision === submittedRevision) dirty = false;
        if (active) setSaveError(null);
      }).catch((e) => {
        if (revision === submittedRevision) submitted = -1;
        if (active) setSaveError(formatSupabaseError(e));
      }).finally(() => { if (queues.get(key) === request) queues.delete(key); });
    };
    flush.current = save;
    change.current = (value) => {
      current = value; dirty = true; revision++;
      try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep visible text. */ }
      clearTimeout(timer); timer = setTimeout(save, 700);
    };
    void (async () => {
      const { data, error: fetchError } = await supabase.from("journal_entries")
        .select("body,e2e_encrypted").eq("id", entryId).eq("user_id", userId).maybeSingle();
      if (fetchError) throw fetchError;
      if (!data) throw new Error("Today's journal could not be loaded. Reopen the entry to try again.");
      if (data.e2e_encrypted) throw new Error("Open and unlock this private entry in the journal to edit it.");
      if (!active) return;
      current = (section === "worship" ? extractWorshipNote(data.body ?? "") : extractHeartNote(data.body ?? "")) ?? "";
      try {
        const raw = sessionStorage.getItem(key);
        if (raw !== null) { const recovered: unknown = JSON.parse(raw); if (typeof recovered === "string") { current = recovered; dirty = true; } }
      } catch { /* Use the database version if the local cache is invalid. */ }
      setText(current); setReady(true);
      if (dirty) timer = setTimeout(save, 700);
    })().catch((e) => { if (active) setSaveError(formatSupabaseError(e)); })
      .finally(() => { if (active) setLoading(false); });
    window.addEventListener("pagehide", save);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("pagehide", save); save(); };
  }, [entryId, user?.id, section, profile?.user_id, profile?.journal_e2e_enabled]);

  const href = entryId ? `${journalNewEntryEditHref(entryId)}?returnTo=${encodeURIComponent(returnTo)}&kind=morning_conversation` : null;
  return <section className={cn(lh.cardFlat, "p-4 space-y-3", className)} aria-label="Journal">
    <div><h2 className={cn(lh.heading, "text-[15px]")}>Journal</h2><p className={cn(lh.bodySm, "mt-1 mb-0")}>{section === "worship" ? "Optional — write here while you worship and listen." : "Write what's on your heart. This stays in the same journal as your video."}</p></div>
    {(busy && !entryId) || loading ? <div className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Opening today's journal…</span></div> : <Textarea value={text} onChange={(e) => { setText(e.target.value); change.current(e.target.value); }} onBlur={() => flush.current()} rows={section === "worship" ? 4 : 5} className={lh.textarea} placeholder={section === "worship" ? "Father, You are good… sovereign… faithful…" : "What's on your heart?"} disabled={!ready} />}
    {href && <p className={lh.footnote}><Link to={href} className={lh.accentLink}>Open full journal · photos, video, audio, sketch</Link></p>}
    {(error || saveError) && <div role="alert" className="text-sm text-destructive"><p>{error ?? saveError}</p>{ready && <Button type="button" size="sm" variant="outline" onClick={() => flush.current()}>Retry save</Button>}</div>}
  </section>;
}
