import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useCompanion, scopeRef, type CompanionScope } from "@/lib/reader/companionStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PrivacyBlurInput } from "@/components/writing/PrivacyBlurInput";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { JournalSaveStatus } from "@/components/journal/JournalSaveStatus";
import { Loader2, Save, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createLocalJournalDocument, openJournalDocument, patchJournalDocument } from "@/lib/journal/journalDocuments";
import { journalEncryptionRequired } from "@/lib/journal/journalEntryDb";
import type { JournalSaveQueue } from "@/lib/journal/journalSaveQueue";
import { useJournalVaultStore } from "@/stores/journalVaultStore";

/** Only an entry identity is stored here. Text lives in the encrypted durable save queue. */
export function companionDraftPointer(userId: string, scope: CompanionScope): string {
  return `yb.companion.entry.v2:${userId}:${scope.book}:${scope.chapter}:${scope.verses.join("-")}`;
}
const subscribeEmpty = () => () => {};
const emptySnapshot = () => undefined;

export function CompanionJournalTab() {
  const { user } = useAuth();
  const scope = useCompanion((state) => state.scope);
  if (!user || !scope) return <p className="p-3 text-sm">Sign in and select a passage to write.</p>;
  return <CompanionEntryEditor key={companionDraftPointer(user.id, scope)} userId={user.id} scope={scope} />;
}

function CompanionEntryEditor({ userId, scope }: { userId: string; scope: CompanionScope }) {
  const { setEntryId, setTab } = useCompanion();
  const dek = useJournalVaultStore((state) => state.dek);
  const [queue, setQueue] = useState<JournalSaveQueue | null>(null);
  const queueRef = useRef<JournalSaveQueue | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [encryptionRequired, setEncryptionRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const saveFlight = useRef(false);
  const alive = useRef(true);
  const state = useSyncExternalStore(queue?.subscribe ?? subscribeEmpty, queue?.getState ?? emptySnapshot, emptySnapshot);
  const locked = (encryptionRequired || state?.snapshot.encrypted) && !dek;
  const title = locked ? "" : String(state?.snapshot.values.title ?? "");
  const body = locked ? "" : String(state?.snapshot.values.body ?? "");
  const pointer = companionDraftPointer(userId, scope);
  const reference = scopeRef(scope);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; if (queueRef.current?.isDirty()) void queueRef.current.flush(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false); setError(null); setEntryId(null);
    void (async () => {
      const required = await journalEncryptionRequired(userId, null);
      if (cancelled) return;
      setEncryptionRequired(required);
      let id: string | null = null;
      try { id = localStorage.getItem(pointer); } catch { /* Durable recovery remains available. */ }
      if (!id) {
        const { data, error: readError } = await supabase.from("journal_entries")
          .select("id").eq("user_id", userId).eq("verse_ref", reference)
          .order("entry_at_ts", { ascending: false }).order("id", { ascending: false }).limit(1);
        if (readError) throw readError;
        id = data?.[0]?.id ?? null;
      }
      if (cancelled) return;
      if (id) {
        const document = await openJournalDocument(userId, id);
        if (cancelled) return;
        queueRef.current = document; setQueue(document); setEntryId(id);
      }
      setLoaded(true);
    })().catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not open this journal entry.");
    });
    return () => { cancelled = true; };
  }, [userId, pointer, reference, dek, retry, setEntryId]);

  const change = useCallback((field: "title" | "body", value: string) => {
    if (!loaded || locked) return;
    let document = queueRef.current;
    if (!document) {
      const id = crypto.randomUUID();
      document = createLocalJournalDocument(userId, id, {
        title: null, body: "", verse_ref: reference, journal_id: null, tags: [],
        entry_at_ts: new Date().toISOString(), analyze_for_mirror: false,
      }, encryptionRequired);
      queueRef.current = document; setQueue(document); setEntryId(id);
      try { localStorage.setItem(pointer, id); } catch { /* No plaintext draft fallback. */ }
    }
    patchJournalDocument(userId, document.current().id, { [field]: field === "title" ? value || null : value });
  }, [loaded, locked, userId, pointer, reference, encryptionRequired, setEntryId]);

  const save = async (advance = false) => {
    const document = queueRef.current;
    if (!document || !loaded || locked || saveFlight.current) return;
    saveFlight.current = true; setSaving(true);
    try {
      const saved = await document.flush();
      if (saved.ok === false) throw saved.error;
      const target = { book: scope.book, chapter: scope.chapter, verses: scope.verses };
      // Preserve other links. A failed link write must never delete an existing one.
      const { data: links, error: linkReadError } = await supabase.from("journal_entry_links")
        .select("id").eq("user_id", userId).eq("entry_id", saved.entryId)
        .eq("target_kind", "verse").contains("target_ref", target).limit(1);
      if (linkReadError) throw linkReadError;
      if (!links?.length) {
        const { data, error: linkError } = await supabase.from("journal_entry_links")
          .insert({ user_id: userId, entry_id: saved.entryId, target_kind: "verse", target_ref: target })
          .select("id").single();
        if (linkError || !data) throw linkError ?? new Error("The verse link was not confirmed.");
      }
      if (!alive.current) return;
      toast({ title: "Saved", description: reference });
      if (advance) setTab("dialogue");
    } catch (cause) {
      if (alive.current) toast({ variant: "destructive", title: "Couldn't finish saving", description: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      saveFlight.current = false;
      if (alive.current) setSaving(false);
    }
  };

  return <div className="h-full flex flex-col p-3 gap-2">
    {error && <div role="alert" className="text-sm text-destructive">{error} <Button size="sm" variant="ghost" onClick={() => setRetry((n) => n + 1)}>Retry</Button></div>}
    {locked && <p role="status" className="text-sm">Unlock your journal in Settings → Journal privacy before reading or editing.</p>}
    {!loaded && !error && !locked && <p role="status" className="text-sm">Opening journal…</p>}
    <PrivacyBlurInput value={title} disabled={!loaded || Boolean(locked)} onChange={(event) => change("title", event.target.value)}
      placeholder="A title for this thought (optional)" className="bg-paper border-paper-edge text-sm" />
    <PolishedTextarea polishResetKey={pointer} value={body} disabled={!loaded || Boolean(locked)}
      allowAiPolish={!encryptionRequired && !state?.snapshot.encrypted}
      onChange={(event) => change("body", event.target.value)}
      placeholder={`What is this passage stirring in you?\n\nWrite freely — your thoughts, questions, doubts, sparks.`}
      className="flex-1 resize-none bg-paper border-paper-edge text-sm leading-relaxed font-scripture" />
    {!locked && <JournalSaveStatus userId={userId} entryId={state?.snapshot.id} />}
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={!loaded || Boolean(locked) || saving || (!body.trim() && !title.trim())}
        onClick={() => void save()} className="gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
      </Button>
      <Button size="sm" disabled={!loaded || Boolean(locked) || saving || (!body.trim() && !title.trim())}
        onClick={() => void save(true)} className="gap-1.5 ml-auto bg-leather text-paper hover:bg-leather/90">
        Save & Dialogue <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  </div>;
}
