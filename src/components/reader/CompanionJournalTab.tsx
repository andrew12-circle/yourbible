import { useEffect, useRef, useState } from "react";
import { useCompanion, scopeRef } from "@/lib/reader/companionStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function draftKey(s: { book: string; chapter: number; verses: number[] }) {
  return `yb.companion.draft.${s.book}.${s.chapter}.${s.verses.join("-")}`;
}

export function CompanionJournalTab() {
  const { user } = useAuth();
  const { scope, entryId, setEntryId, setTab } = useCompanion();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const debRef = useRef<number | null>(null);

  // load existing entry or draft when scope changes
  useEffect(() => {
    if (!scope || !user) return;
    setLoaded(false);
    (async () => {
      const ref = scopeRef(scope);
      // find most recent entry pinned to this verse
      const { data } = await supabase
        .from("journal_entries")
        .select("id,title,body")
        .eq("user_id", user.id)
        .eq("verse_ref", ref)
        .order("entry_at_ts", { ascending: false })
        .limit(1);
      if (data && data[0]) {
        setEntryId(data[0].id);
        setTitle(data[0].title ?? "");
        setBody(data[0].body ?? "");
      } else {
        // load local draft
        try {
          const raw = localStorage.getItem(draftKey(scope));
          if (raw) {
            const j = JSON.parse(raw);
            setTitle(j.title ?? "");
            setBody(j.body ?? "");
          } else {
            setTitle(""); setBody("");
          }
        } catch { setTitle(""); setBody(""); }
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope?.book, scope?.chapter, scope?.verses.join(","), user?.id]);

  // local-draft autosave (debounced)
  useEffect(() => {
    if (!scope || !loaded) return;
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => {
      try { localStorage.setItem(draftKey(scope), JSON.stringify({ title, body })); }
      catch { /* */ }
    }, 400);
  }, [title, body, scope, loaded]);

  const save = async (advance = false) => {
    if (!user || !scope) return;
    if (!body.trim() && !title.trim()) return;
    setSaving(true);
    try {
      const ref = scopeRef(scope);
      let id = entryId;
      if (id) {
        const { error } = await supabase.from("journal_entries").update({
          title: title || null, body, verse_ref: ref,
        }).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("journal_entries").insert({
          user_id: user.id, body, title: title || null, verse_ref: ref,
        }).select("id").maybeSingle();
        if (error) throw error;
        id = data?.id ?? null;
        if (id) setEntryId(id);
      }
      if (id) {
        // ensure a single verse-link row exists for this entry/scope
        await supabase.from("journal_entry_links")
          .delete().eq("entry_id", id).eq("target_kind", "verse");
        await supabase.from("journal_entry_links").insert({
          user_id: user.id,
          entry_id: id,
          target_kind: "verse",
          target_ref: { book: scope.book, chapter: scope.chapter, verses: scope.verses } as never,
        });
      }
      try { localStorage.removeItem(draftKey(scope)); } catch { /* */ }
      toast({ title: "Saved", description: ref });
      if (advance) setTab("dialogue");
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't save", description: String((e as Error).message ?? e) });
    } finally { setSaving(false); }
  };

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="A title for this thought (optional)"
        className="bg-paper border-paper-edge text-sm"
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`What is this passage stirring in you?\n\nWrite freely — your thoughts, questions, doubts, sparks.`}
        className="flex-1 resize-none bg-paper border-paper-edge text-sm leading-relaxed font-scripture"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm" variant="outline"
          disabled={saving || !body.trim()}
          onClick={() => save(false)}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </Button>
        <Button
          size="sm"
          disabled={saving || !body.trim()}
          onClick={() => save(true)}
          className="gap-1.5 ml-auto bg-leather text-paper hover:bg-leather/90"
        >
          Save & Dialogue <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}