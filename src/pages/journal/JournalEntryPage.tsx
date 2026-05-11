import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Edit, Trash2, MapPin, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalLayout from "./JournalLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { moodMeta } from "@/components/journal/MoodPicker";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import EntryMiniMap from "@/components/journal/EntryMiniMap";
import { listEntryLinks, type EntryLink } from "@/lib/journal/links";

interface Entry {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string;
  mood: number | null;
  tags: string[];
  location_name: string | null;
  verse_ref: string | null;
  belief_id: string | null;
  analyze_for_mirror: boolean;
  lat: number | null;
  lng: number | null;
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
  const [photos, setPhotos] = useState<{ id: string; url?: string }[]>([]);
  const [beliefStatement, setBeliefStatement] = useState<string | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [scoring, setScoring] = useState(false);
  const [links, setLinks] = useState<EntryLink[]>([]);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("journal_entries").select("*").eq("id", id).maybeSingle();
    setEntry(data as Entry | null);
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
    setPhotos((ph ?? []).map((p) => ({ id: p.id, url: urls[p.storage_path] })));
    const { data: s } = await supabase
      .from("journal_entry_scores")
      .select("axes,themes,assumptions")
      .eq("entry_id", id)
      .maybeSingle();
    setScore((s as Score | null) ?? null);
    setLinks(await listEntryLinks(id));
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!entry) return <JournalLayout title="Entry" back="/journal">Loading…</JournalLayout>;

  const remove = async () => {
    if (!confirm("Delete this entry permanently?")) return;
    await supabase.from("journal_entries").delete().eq("id", entry.id);
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

  const m = moodMeta(entry.mood);

  return (
    <JournalLayout
      title="Entry"
      back="/journal"
      right={
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => navigate(`/journal/${entry.id}/edit`)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={remove}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      }
    >
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

      {entry.title && <h1 className="font-display text-2xl mb-4">{entry.title}</h1>}

      {photos.length > 0 && (
        <div className={`mb-5 grid gap-2 ${photos.length === 1 ? "" : "grid-cols-2"}`}>
          {photos.map((p) =>
            p.url ? (
              <img key={p.id} src={p.url} alt="" className="w-full rounded-lg object-cover max-h-96" />
            ) : null,
          )}
        </div>
      )}

      <div className="font-serif text-[16px] leading-relaxed whitespace-pre-wrap mb-6">
        {entry.body || <span className="italic text-muted-foreground">No body</span>}
      </div>

      {entry.lat != null && entry.lng != null && (
        <EntryMiniMap lat={entry.lat} lng={entry.lng} className="mb-6" />
      )}

      {links.length > 0 && (
        <section className="mb-6 rounded-xl border border-border bg-card p-4">
          <h3 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mb-2">
            Linked
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {links.map((l) => (
              <LinkChip key={l.id} link={l} />
            ))}
          </div>
        </section>
      )}

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
    </JournalLayout>
  );
}

function AxisBar({ axis, value }: { axis: string; value: number }) {
  const v = Math.max(-1, Math.min(1, value));
  const pct = ((v + 1) / 2) * 100;
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

function LinkChip({ link }: { link: EntryLink }) {
  const ref = link.target_ref as Record<string, unknown>;
  let label = link.target_kind;
  let to = "/journal";
  switch (link.target_kind) {
    case "verse": {
      const r = String(ref.ref ?? "");
      label = r || "verse";
      to = `/read/${guessBookAbbr(r)}/${guessChapter(r)}`;
      break;
    }
    case "belief":
      label = `belief: ${String(ref.statement ?? "").slice(0, 40) || "open"}`;
      to = `/framework/beliefs/${String(ref.id ?? "")}`;
      break;
    case "tension":
      label = "tension";
      to = `/framework/tensions`;
      break;
    case "study":
      label = `study: ${String(ref.topic ?? "")}`;
      to = `/framework/study`;
      break;
    case "daily":
      label = "daily reading";
      to = `/framework/daily`;
      break;
    case "chat_thread":
      label = "chat";
      to = `/framework/chat`;
      break;
    case "artifact":
      label = "artifact";
      to = `/framework/artifacts/${String(ref.id ?? "")}`;
      break;
    case "prompt":
      label = `prompt: ${String(ref.text ?? "").slice(0, 40)}`;
      to = "/journal";
      break;
  }
  return (
    <Link
      to={to}
      className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground/80 hover:bg-muted/70 transition"
    >
      {label}
    </Link>
  );
}