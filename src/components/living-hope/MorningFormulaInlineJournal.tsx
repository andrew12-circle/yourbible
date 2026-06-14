import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { journalNewEntryEditHref } from "@/lib/journal/entryNavigation";
import {
  extractHeartNote,
  extractWorshipNote,
  MORNING_CONVERSATION_BODY_TEMPLATE,
  syncHeartToConversationEntry,
  syncWorshipToConversationEntry,
} from "@/lib/livingHope/morningConversationJournal";
import { supabase } from "@/integrations/supabase/client";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Section = "worship" | "heart";

type Props = {
  entryId: string | null;
  busy: boolean;
  error: string | null;
  section: Section;
  returnTo: string;
  className?: string;
};

const SECTION_COPY: Record<
  Section,
  { title: string; description: string; placeholder: string; rows: number }
> = {
  worship: {
    title: "Journal",
    description: "Optional — write here while you worship and listen. It saves as you go.",
    placeholder: "Father, You are good… sovereign… faithful…",
    rows: 4,
  },
  heart: {
    title: "Journal",
    description: "Get what's on your heart out honestly — type, dictate, sketch, or add media below.",
    placeholder: "What's weighing on you? What do you need to say to Him?",
    rows: 5,
  },
};

function extractSection(body: string, section: Section): string {
  return section === "worship"
    ? extractWorshipNote(body) ?? ""
    : extractHeartNote(body) ?? "";
}

export function MorningFormulaInlineJournal({
  entryId,
  busy,
  error,
  section,
  returnTo,
  className,
}: Props) {
  const { user } = useAuth();
  const copy = SECTION_COPY[section];
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedEntryId = useRef<string | null>(null);

  useEffect(() => {
    if (!entryId || !user?.id) return;
    if (loadedEntryId.current === entryId) return;
    setLoading(true);
    setSaveError(null);
    void supabase
      .from("journal_entries")
      .select("body")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setSaveError(fetchError.message);
          return;
        }
        const body = String(data?.body ?? MORNING_CONVERSATION_BODY_TEMPLATE);
        setText(extractSection(body, section));
        loadedEntryId.current = entryId;
      })
      .finally(() => setLoading(false));
  }, [entryId, section, user?.id]);

  useEffect(() => {
    if (!entryId || !user?.id || loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void (section === "worship"
        ? syncWorshipToConversationEntry(user.id, entryId, text)
        : syncHeartToConversationEntry(user.id, entryId, text)
      ).catch((e) => {
        setSaveError(e instanceof Error ? e.message : "Couldn't save journal");
      });
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [entryId, loading, section, text, user?.id]);

  const journalHref = entryId
    ? `${journalNewEntryEditHref(entryId)}?returnTo=${encodeURIComponent(returnTo)}&kind=morning_conversation`
    : null;

  return (
    <section className={cn(lh.cardFlat, "p-4 space-y-3", className)} aria-label={copy.title}>
      <div>
        <h2 className={cn(lh.heading, "text-[15px]")}>{copy.title}</h2>
        <p className={cn(lh.bodySm, "mt-1 mb-0")}>{copy.description}</p>
      </div>

      {busy && !entryId ? (
        <div className="flex items-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-sm">Starting today&apos;s journal…</span>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={copy.rows}
          className={lh.textarea}
          placeholder={copy.placeholder}
          disabled={!entryId}
        />
      )}

      {journalHref ? (
        <p className={cn(lh.footnote, "mb-0")}>
          <Link to={journalHref} className={cn(lh.accentLink, "font-medium")}>
            Photos, audio, sketch…
          </Link>
          <span className="text-muted-foreground/80"> — opens today&apos;s entry and returns here.</span>
        </p>
      ) : null}

      {error || saveError ? (
        <p className="text-[12px] text-destructive">{error ?? saveError}</p>
      ) : null}
    </section>
  );
}
