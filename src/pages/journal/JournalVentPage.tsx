import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { Navigate, useNavigate } from "react-router-dom";
import { Flame, Lock, Loader2, Trash2 } from "lucide-react";
import JournalPrivacyBlurToggle from "@/components/journal/JournalPrivacyBlurToggle";
import { DictInterimPreview } from "@/components/journal/DictInterimPreview";
import { Button } from "@/components/ui/button";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getDefaultJournalId } from "@/lib/journal/journals";
import JournalShell from "@/components/journal/JournalShell";

interface VentRow {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string;
}

/**
 * "Let it out" surface — kept deliberately minimal:
 *  - no mood, no tags, no AI scoring, no prompts
 *  - never goes into the worldview mirror or My AI retrieval
 *  - hidden from the main journal list
 *
 * The system records it (so the user feels heard) but doesn't focus on it.
 */
export default function JournalVentPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [recent, setRecent] = useState<VentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");

  const loadRecent = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("journal_entries")
      .select("id,title,body,entry_at_ts")
      .eq("user_id", user.id)
      .eq("entry_kind", "vent")
      .order("entry_at_ts", { ascending: false })
      .limit(20);
    setRecent((data as VentRow[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadRecent();
    requestAnimationFrame(() => taRef.current?.focus());
  }, [user, loadRecent]);

  const charCount = body.length;
  const wordCount = useMemo(() => (body.trim() ? body.trim().split(/\s+/).length : 0), [body]);

  const save = async () => {
    if (!user) return;
    dictateRef.current?.stop();
    if (!body.trim()) {
      toast({ title: "Type something first — even one line counts." });
      return;
    }
    setSaving(true);
    const journalId = await getDefaultJournalId(user.id).catch(() => null);
    const now = new Date();
    const { error } = await supabase.from("journal_entries").insert({
      user_id: user.id,
      journal_id: journalId,
      title: null,
      body,
      tags: [],
      analyze_for_mirror: false,
      entry_kind: "vent",
      entry_at_ts: now.toISOString(),
      entry_at: now.toISOString().slice(0, 10),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
    toast({ title: "Heard. It's out of you." });
    void loadRecent();
  };

  const remove = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Delete this vent permanently?")) return;
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRecent((rs) => rs.filter((r) => r.id !== id));
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalShell
      journalId={null}
      activeTab="list"
      showTabs={false}
      coverTitle="Vent space"
      backTo="/journal"
      hideComposeFab
      headerRight={<JournalPrivacyBlurToggle tone="onCover" />}
    >
      <div className="px-5 pt-3 pb-safe-28">
      <div className="-mt-2 mb-5 flex items-start gap-3 rounded-2xl border border-zinc-800/15 bg-zinc-900/[0.04] p-4 text-[14px] leading-relaxed text-foreground/85 dark:border-white/10 dark:bg-white/[0.04]">
        <Flame className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden />
        <p className="min-w-0">
          A private place to <strong className="font-semibold">let it out</strong> — anger, hurt, disappointment.
          Type without editing. We record it so you feel heard, but it{" "}
          <strong className="font-semibold">won't show up</strong> in your main journal, the Worldview Mirror, or My AI
          conversations.
        </p>
      </div>

      {/* Sans: match main journal composers under .app-theme. */}
      <PolishedTextarea
        ref={taRef}
        allowAiPolish={false}
        polishResetKey="vent"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Say it. No one has to read this. No one is grading this. What are you mad about? What hurts? What's not okay?"
        rows={14}
        className="resize-y rounded-2xl border-border/70 bg-card font-sans text-[16px] leading-relaxed shadow-sm"
      />

      <DictInterimPreview
        text={dictInterim}
        className="mt-1 text-sm italic leading-relaxed text-muted-foreground/80"
      />

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        <span>Not analyzed. Not retrieved by AI. Only visible here.</span>
        <span className="ml-auto tabular-nums">
          {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount} chars
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DictateButton
          ref={dictateRef}
          userId={user?.id}
          size="sm"
          onAppend={(chunk) => setBody((b) => mergeDictatedText(b, chunk))}
          onInterim={setDictInterim}
        />
        <Button onClick={save} disabled={saving || !body.trim()} className="flex-1 sm:flex-none">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
            </>
          ) : (
            "Let it out"
          )}
        </Button>
        <Button variant="ghost" onClick={() => setBody("")} disabled={!body || saving}>
          Clear
        </Button>
        <Button variant="ghost" onClick={() => navigate("/journal")}>
          Back
        </Button>
      </div>

      <section className="mt-10 border-t border-border/40 pt-5">
        <button
          type="button"
          onClick={() => setShowRecent((v) => !v)}
          className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {showRecent ? "Hide past vents" : `Past vents (${recent.length})`}
        </button>
        {showRecent && (
          <div className="mt-3 space-y-2">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing saved here yet.</p>
            )}
            {recent.map((r) => (
              <VentRowCard key={r.id} row={r} onDelete={() => void remove(r.id)} />
            ))}
            {recent.length > 0 && (
              <p className="pt-2 text-[12px] text-muted-foreground">
                Past vents stay private — they're only listed here, not in any other view.
              </p>
            )}
          </div>
        )}
      </section>
      </div>
    </JournalShell>
  );
}

function VentRowCard({ row, onDelete }: { row: VentRow; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(row.entry_at_ts);
  const label = date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const preview = row.body.split("\n").find((l) => l.trim().length > 0) ?? row.body.slice(0, 140);
  return (
    <article className="rounded-xl border border-border/60 bg-card/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] tabular-nums text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground transition-colors hover:text-destructive"
          aria-label="Delete vent"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 block w-full text-left text-[14px] leading-relaxed text-foreground/85"
      >
        {/* Sans: vent excerpts same family as composer + journal read view. */}
        {expanded ? (
          <span className="whitespace-pre-wrap font-sans">{row.body}</span>
        ) : (
          <span className="line-clamp-3 font-sans">{preview}</span>
        )}
      </button>
    </article>
  );
}
