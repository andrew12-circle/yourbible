import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Edit, Trash2, MapPin, BookOpen, Sparkles, Loader2, MessageCircle, Ear, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { deleteJournalEntry } from "@/lib/journal/entryActions";
import { moodMeta } from "@/components/journal/MoodPicker";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { JournalSketchInline, partitionJournalPhotos } from "@/components/journal/JournalSketchInline";
import { shouldSuggestJournalTitle } from "@/lib/journal/entryDisplay";
import { suggestJournalEntryTitle } from "@/lib/journal/suggestTitle";
import {
  entryBodyHasSketchTranscription,
  transcribeEntrySketchPaths,
} from "@/lib/journal/sketchTranscription";
import EntryMiniMap from "@/components/journal/EntryMiniMap";
import { syncEntryWikilinks } from "@/lib/journal/links";
import EntryLinksPanel from "@/components/journal/EntryLinksPanel";
import {
  LISTENING_SECTIONS,
  isListeningBody,
  isListeningEmpty,
  parseListeningBody,
} from "@/lib/journal/listeningEntry";
import { isChatJournalExport } from "@/lib/journal/chatJournalEntry";
import ChatJournalView from "@/components/journal/ChatJournalView";

interface Entry {
  id: string;
  title: string | null;
  body: string;
  summary: string | null;
  entry_at_ts: string;
  mood: number | null;
  tags: string[];
  location_name: string | null;
  verse_ref: string | null;
  belief_id: string | null;
  analyze_for_mirror: boolean;
  lat: number | null;
  lng: number | null;
  entry_kind?: string | null;
}
interface Score {
  axes: Record<string, number>;
  themes: string[];
  assumptions: string[];
}

export default function JournalEntryPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [photos, setPhotos] = useState<{ id: string; storage_path: string; url?: string }[]>([]);
  const [beliefStatement, setBeliefStatement] = useState<string | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [scoring, setScoring] = useState(false);
  const [linksReloadKey, setLinksReloadKey] = useState(0);
  const [openingAi, setOpeningAi] = useState(false);
  const [transcribingSketch, setTranscribingSketch] = useState(false);
  const [entryLoading, setEntryLoading] = useState(true);
  const [entryNotFound, setEntryNotFound] = useState(false);
  const autoTranscribeAttempted = useRef(false);
  const titleSuggestAttempted = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setEntryLoading(true);
    setEntryNotFound(false);
    const { data, error } = await supabase.from("journal_entries").select("*").eq("id", id).maybeSingle();
    if (error) {
      setEntryLoading(false);
      toast({ title: "Couldn't load entry", description: error.message, variant: "destructive" });
      return;
    }
    if (!data) {
      setEntry(null);
      setEntryLoading(false);
      setEntryNotFound(true);
      return;
    }
    setEntry(data as Entry);
    if (data?.belief_id) {
      const { data: b } = await supabase
        .from("belief_nodes")
        .select("statement")
        .eq("id", data.belief_id)
        .maybeSingle();
      setBeliefStatement((b as { statement?: string } | null)?.statement ?? null);
    }
    const { data: ph } = await supabase
      .from("journal_photos")
      .select("id,storage_path")
      .eq("entry_id", id);
    const urls = await getSignedPhotoUrls((ph ?? []).map((p) => p.storage_path));
    setPhotos(
      (ph ?? []).map((p) => ({
        id: p.id,
        storage_path: p.storage_path,
        url: urls[p.storage_path],
      })),
    );
    const { data: s } = await supabase
      .from("journal_entry_scores")
      .select("axes,themes,assumptions")
      .eq("entry_id", id)
      .maybeSingle();
    setScore((s as Score | null) ?? null);
    if (user?.id && typeof data.body === "string" && data.body.includes("[[")) {
      await syncEntryWikilinks(user.id, id, data.body);
      setLinksReloadKey((k) => k + 1);
    }
    setEntryLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    if (!user) return;
    autoTranscribeAttempted.current = false;
    titleSuggestAttempted.current = false;
    void load();
  }, [user, load]);

  const sketchStoragePaths = useMemo(() => {
    const { sketches } = partitionJournalPhotos(photos);
    return sketches.map((s) => s.storage_path);
  }, [photos]);

  const needsSketchTranscription =
    !!entry &&
    sketchStoragePaths.length > 0 &&
    !entryBodyHasSketchTranscription(entry.body);

  useEffect(() => {
    if (!entry || !needsSketchTranscription || autoTranscribeAttempted.current || transcribingSketch) {
      return;
    }
    autoTranscribeAttempted.current = true;
    setTranscribingSketch(true);
    (async () => {
      const tx = await transcribeEntrySketchPaths(entry.id, sketchStoragePaths);
      setTranscribingSketch(false);
      if (!tx.ok) {
        toast({
          title: "Couldn't read handwriting",
          description: tx.error,
          variant: "destructive",
        });
        autoTranscribeAttempted.current = false;
        return;
      }
      if (tx.transcribed > 0 || tx.title) {
        await load();
        toast({
          title: tx.title ? "Entry named and transcribed" : "Handwritten note transcribed",
          description: tx.title
            ? `“${tx.title}” — your handwriting is below the sketch.`
            : "Your handwriting was typed out below the sketch.",
        });
      }
    })();
  }, [entry, needsSketchTranscription, sketchStoragePaths, transcribingSketch, load]);

  useEffect(() => {
    if (!entry || titleSuggestAttempted.current) return;
    if (!shouldSuggestJournalTitle(entry.title, entry.body, entry.summary)) return;
    titleSuggestAttempted.current = true;
    void suggestJournalEntryTitle({ entryId: entry.id, body: entry.body }).then((res) => {
      if (res.ok && res.title) {
        setEntry((prev) => (prev?.id === entry.id ? { ...prev, title: res.title } : prev));
      }
    });
  }, [entry]);

  const transcribeSketchNow = async () => {
    if (!entry || sketchStoragePaths.length === 0 || transcribingSketch) return;
    autoTranscribeAttempted.current = true;
    setTranscribingSketch(true);
    const tx = await transcribeEntrySketchPaths(entry.id, sketchStoragePaths);
    setTranscribingSketch(false);
    if (!tx.ok) {
      toast({ title: "Couldn't read handwriting", description: tx.error, variant: "destructive" });
      autoTranscribeAttempted.current = false;
      return;
    }
    if (tx.transcribed > 0 || tx.title) {
      await load();
      toast({
        title: tx.title ? "Entry named and transcribed" : "Handwritten note transcribed",
        description: tx.title ? `“${tx.title}”` : undefined,
      });
    } else {
      toast({ title: "Already transcribed" });
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  if (entryLoading) {
    return (
      <JournalShell journalId={null} activeTab="list" showTabs={false} coverTitle="Entry" backTo="/journal" hideComposeFab>
        <div className="flex justify-center py-16 px-5">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </JournalShell>
    );
  }
  if (entryNotFound || !entry) {
    return (
      <JournalShell journalId={null} activeTab="list" showTabs={false} coverTitle="Entry not found" backTo="/journal" hideComposeFab>
        <div className="text-center py-16 px-6">
          <p className="text-[15px] font-semibold">Entry not found</p>
          <p className="text-[13px] text-muted-foreground mt-1 mb-4">This entry may have been deleted.</p>
          <Button asChild variant="outline">
            <Link to="/journal">Back to journal</Link>
          </Button>
        </div>
      </JournalShell>
    );
  }

  if (entry.entry_kind === "chat") {
    return <Navigate to={`/journal/chat/${entry.id}`} replace />;
  }

  const remove = async () => {
    if (!user || !entry) return;
    if (!confirm("Delete this entry permanently?")) return;
    const { error } = await deleteJournalEntry(entry.id, user.id);
    if (error) {
      toast({ title: "Couldn't delete entry", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/journal");
  };

  const scoreNow = async () => {
    setScoring(true);
    const { error } = await supabase.functions.invoke("journal-score-entry", {
      body: { entry_id: entry.id },
    });
    setScoring(false);
    if (error) {
      toast({ title: "Couldn't score", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    toast({ title: "Entry scored" });
  };

  const askAiToRespond = async () => {
    if (!entry || !user || openingAi) return;
    setOpeningAi(true);
    try {
      await supabase
        .from("journal_entries")
        .update({ entry_kind: "chat" })
        .eq("id", entry.id)
        .eq("user_id", user.id);
      const { data: existing } = await supabase
        .from("my_ai_chats")
        .select("id")
        .eq("journal_entry_id", entry.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing?.id) {
        await supabase
          .from("my_ai_chats")
          .insert({ user_id: user.id, journal_entry_id: entry.id, title: entry.title ?? null });
      }
      navigate(`/journal/chat/${entry.id}`);
    } catch (e) {
      toast({ title: "Couldn't open AI reply", description: String(e), variant: "destructive" });
    } finally {
      setOpeningAi(false);
    }
  };

  const m = moodMeta(entry.mood);
  const renderListening =
    entry.entry_kind === "listening" || isListeningBody(entry.body);
  const isChatEntry = entry.entry_kind === "chat";
  const showChatJournalView = isChatJournalExport(entry.body, entry.summary);
  const entryHeading = entry.title?.trim() || null;

  return (
    <JournalShell
      journalId={null}
      activeTab="list"
      showTabs={false}
      coverTitle={entryHeading ?? "Entry"}
      backTo="/journal"
      hideComposeFab
      headerRight={
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => navigate(`/journal/${entry.id}/edit`)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => void remove()}>
            <Trash2 className="w-4 h-4 text-red-200" />
          </Button>
        </div>
      }
    >
      <div className="px-5 pt-3 pb-safe-28">
      {entry.entry_kind !== "chat" && entry.entry_kind !== "vent" && entry.body?.trim() && (
        <Button
          variant="outline"
          size="sm"
          className="mb-3 gap-2"
          onClick={askAiToRespond}
          disabled={openingAi}
        >
          {openingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Ask AI to respond to this entry
        </Button>
      )}

      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex flex-wrap items-center gap-2">
        <span>{new Date(entry.entry_at_ts).toLocaleString(undefined, {
          weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
        })}</span>
        {m && <span className={m.color}>· {m.label}</span>}
        {entry.location_name && (
          <span className="inline-flex items-center gap-1">
            · <MapPin className="w-3 h-3" /> {entry.location_name}
          </span>
        )}
      </div>

      {isChatEntry && (
        <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <MessageCircle className="h-3 w-3" /> Journaled with AI
        </div>
      )}

      {entryHeading ? (
        <h1 className="font-display text-2xl mb-4">{entryHeading}</h1>
      ) : null}

      {(() => {
        const { sketches, attachments } = partitionJournalPhotos(photos);
        return (
          <>
            {sketches.length > 0 ? (
              <>
                <JournalSketchInline
                  sketches={sketches}
                  className="mb-3"
                  onOpenSketch={() => navigate(`/journal/${entry.id}/edit`)}
                />
                {needsSketchTranscription ? (
                  <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
                    <PenLine className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="flex-1 text-muted-foreground">
                      {transcribingSketch
                        ? "AI is reading your handwriting…"
                        : "Handwriting saved — tap to type it out below."}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={transcribingSketch}
                      onClick={() => void transcribeSketchNow()}
                    >
                      {transcribingSketch ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                          Reading…
                        </>
                      ) : (
                        "Transcribe handwriting"
                      )}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
            {attachments.length > 0 ? (
              <div className={`mb-5 grid gap-2 ${attachments.length === 1 ? "" : "grid-cols-2"}`}>
                {attachments.map((p) =>
                  p.url ? (
                    <img key={p.id} src={p.url} alt="" className="w-full rounded-lg object-cover max-h-96" />
                  ) : null,
                )}
              </div>
            ) : null}
          </>
        );
      })()}

      {renderListening ? (
        <ListeningSectionsView body={entry.body} />
      ) : showChatJournalView ? (
        <ChatJournalView
          body={entry.body}
          summary={entry.summary}
          className="mb-6"
        />
      ) : isChatEntry ? (
        <div className="font-sans text-[16px] leading-relaxed mb-6 prose prose-sm dark:prose-invert max-w-none prose-hr:my-4 prose-p:my-2">
          {entry.body
            ? <ReactMarkdown>{entry.body}</ReactMarkdown>
            : <span className="italic text-muted-foreground">No body</span>}
        </div>
      ) : (
        <div className="mb-6 space-y-4">
          {entry.summary?.trim() ? (
            <section aria-label="Entry summary">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Summary
              </p>
              <p className="font-sans text-[16px] leading-relaxed text-foreground whitespace-pre-wrap">
                {entry.summary}
              </p>
            </section>
          ) : null}
          <section aria-label="Entry body">
            {entry.summary?.trim() ? (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Full text
              </p>
            ) : null}
            <div className="font-sans text-[16px] leading-relaxed whitespace-pre-wrap">
              {transcribingSketch && !entry.body?.trim() ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Reading your handwriting…
                </span>
              ) : entry.body ? (
                entry.body
              ) : (
                <span className="italic text-muted-foreground">No body</span>
              )}
            </div>
          </section>
        </div>
      )}

      {entry.lat != null && entry.lng != null && (
        <EntryMiniMap lat={entry.lat} lng={entry.lng} className="mb-6" />
      )}

      {id ? (
        <EntryLinksPanel
          entryId={id}
          reloadKey={linksReloadKey}
          className="mb-6 rounded-xl border border-border bg-card p-4"
        />
      ) : null}

      {(entry.tags.length > 0 || entry.verse_ref || entry.belief_id) && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {entry.verse_ref && (
            <Link
              to={`/read/${guessBookAbbr(entry.verse_ref)}/${guessChapter(entry.verse_ref)}`}
              className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 inline-flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" /> {entry.verse_ref}
            </Link>
          )}
          {entry.belief_id && beliefStatement && (
            <Link
              to={`/framework/beliefs/${entry.belief_id}`}
              className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900"
            >
              belief: {beliefStatement.slice(0, 60)}
            </Link>
          )}
          {entry.tags.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium">Worldview mirror</h3>
            {!entry.analyze_for_mirror && !score && (
              <p className="text-xs text-muted-foreground mt-1">
                This entry isn't included in the mirror. Edit it and turn on "Include in worldview mirror"
                to have it scored.
              </p>
            )}
            {entry.analyze_for_mirror && !score && (
              <>
                <p className="text-xs text-muted-foreground mt-1">Not yet scored.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={scoreNow} disabled={scoring}>
                  {scoring ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Scoring…</> : "Score this entry"}
                </Button>
              </>
            )}
            {score && (
              <div className="mt-2 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(score.axes).map(([axis, val]) => (
                    <AxisBar key={axis} axis={axis} value={val} />
                  ))}
                </div>
                {score.themes?.length > 0 && (
                  <div className="text-xs"><span className="text-muted-foreground">Themes:</span> {score.themes.join(", ")}</div>
                )}
                {score.assumptions?.length > 0 && (
                  <div className="text-xs"><span className="text-muted-foreground">Assumptions:</span> {score.assumptions.join("; ")}</div>
                )}
                <Button size="sm" variant="ghost" className="mt-1 h-7 text-xs" onClick={scoreNow} disabled={scoring}>
                  {scoring ? "Re-scoring…" : "Re-score"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
      </div>
    </JournalShell>
  );
}

function ListeningSectionsView({ body }: { body: string }) {
  const sections = useMemo(() => parseListeningBody(body), [body]);
  if (isListeningEmpty(sections)) {
    return (
      <div className="font-sans text-[16px] leading-relaxed whitespace-pre-wrap mb-6">
        {body || <span className="italic text-muted-foreground">No body</span>}
      </div>
    );
  }
  return (
    <section
      className="mb-6 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 dark:border-amber-700/40 dark:bg-amber-900/15"
      aria-label="Listening entry"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-full border border-amber-300 bg-amber-100/80 p-2 text-amber-700 dark:border-amber-600 dark:bg-amber-800/40 dark:text-amber-200">
          <Ear className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-tight">Listening — heard from God</div>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            Thought · Words · Plan · Interpretation
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {LISTENING_SECTIONS.map((section) => {
          const value = sections[section.key]?.trim();
          if (!value) return null;
          return (
            <div
              key={section.key}
              className="rounded-lg border border-border bg-background/85 p-3"
            >
              <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {section.label}
              </div>
              <div className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap">{value}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AxisBar({ axis, value }: { axis: string; value: number }) {
  const v = Math.max(-1, Math.min(1, value));
  const _pct = ((v + 1) / 2) * 100;
  const [neg, pos] = axisLabels(axis);
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{neg}</span><span>{pos}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute top-0 h-full bg-foreground"
          style={{ left: "50%", width: `${Math.abs(v) * 50}%`, transform: v < 0 ? "translateX(-100%)" : "" }}
        />
      </div>
    </div>
  );
}

function axisLabels(axis: string): [string, string] {
  // axis is like "love_fear" → first half is positive (love), second negative (fear)
  // value -1..+1 where +1 = first label, -1 = second label
  const parts = axis.split("_");
  if (parts.length === 2) return [parts[1], parts[0]];
  return [axis, ""];
}

function guessBookAbbr(ref: string): string {
  const m = ref.match(/^(\d?\s?[A-Za-z]+)/);
  if (!m) return "Jhn";
  const raw = m[1].replace(/\s+/g, "").toLowerCase();
  // crude abbr mapping
  const map: Record<string, string> = {
    genesis: "Gen", exodus: "Exo", leviticus: "Lev", numbers: "Num", deuteronomy: "Deu",
    joshua: "Jos", judges: "Jdg", ruth: "Rut",
    psalms: "Psa", psalm: "Psa", proverbs: "Pro", ecclesiastes: "Ecc",
    isaiah: "Isa", jeremiah: "Jer", ezekiel: "Eze", daniel: "Dan",
    matthew: "Mat", mark: "Mrk", luke: "Luk", john: "Jhn",
    acts: "Act", romans: "Rom", "1corinthians": "1Co", "2corinthians": "2Co",
    galatians: "Gal", ephesians: "Eph", philippians: "Php", colossians: "Col",
    "1thessalonians": "1Th", "2thessalonians": "2Th", "1timothy": "1Ti", "2timothy": "2Ti",
    titus: "Tit", philemon: "Phm", hebrews: "Heb", james: "Jas",
    "1peter": "1Pe", "2peter": "2Pe", "1john": "1Jn", "2john": "2Jn", "3john": "3Jn",
    jude: "Jud", revelation: "Rev",
  };
  return map[raw] ?? "Jhn";
}
function guessChapter(ref: string): number {
  const m = ref.match(/(\d+):/);
  return m ? Number(m[1]) : 1;
}
