import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  SPIRITUAL_TIMELINE_SEED_MARKER,
  clearSeededSpiritualTimeline,
  parseSeedJson,
  seedSpiritualTimeline,
  summarizeSeed,
} from "@/lib/seed/spiritualTimelineSeed";

type SeedTimelineCardProps = {
  userId: string;
};

export function SeedTimelineCard({ userId }: SeedTimelineCardProps) {
  const [jsonText, setJsonText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);

  const onValidate = useCallback(() => {
    setValidating(true);
    setStatus(null);
    try {
      const doc = parseSeedJson(jsonText);
      const s = summarizeSeed(doc);
      setStatus(
        `Valid. Would create ${s.journalEntries} journal entries, ${s.books} books, ${s.people} people, ${s.mentions} mentions.`,
      );
      toast({ title: "JSON is valid" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Validation failed", description: msg, variant: "destructive" });
      setStatus(null);
    } finally {
      setValidating(false);
    }
  }, [jsonText]);

  const onSeed = useCallback(async () => {
    setSeeding(true);
    setStatus(null);
    try {
      const doc = parseSeedJson(jsonText);
      const result = await seedSpiritualTimeline(userId, supabase, doc);
      const { journals, books, people, mentions } = result.inserted;
      setStatus(`Created ${journals} journal entries, ${books} books, ${people} people, ${mentions} mentions.`);
      toast({ title: "Seed complete" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Seed failed", description: msg, variant: "destructive" });
      setStatus(null);
    } finally {
      setSeeding(false);
    }
  }, [jsonText, userId]);

  const onClear = useCallback(async () => {
    if (
      !window.confirm(
        "Delete all journal entries that were created by the spiritual timeline seed? " +
          "Linked entity mentions for those entries will be removed automatically. This cannot be undone.",
      )
    ) {
      return;
    }
    setClearing(true);
    setStatus(null);
    try {
      const { deletedJournals, deletedMentions } = await clearSeededSpiritualTimeline(userId, supabase);
      setStatus(`Removed ${deletedJournals} journal entries and ${deletedMentions} related mentions.`);
      toast({ title: "Seeded entries cleared" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Clear failed", description: msg, variant: "destructive" });
      setStatus(null);
    } finally {
      setClearing(false);
    }
  }, [userId]);

  return (
    <Card className="rounded-lg border border-paper-edge bg-paper/70 shadow-soft">
      <CardHeader className="space-y-1">
        <CardTitle className="font-display text-lg text-leather">Seed timeline</CardTitle>
        <CardDescription className="text-sm text-muted-foreground leading-relaxed">
          Paste your curated spiritual timeline JSON (timeline events, books, and key people). This writes into your
          journal and knowledge entities so Faith Journey, identity synthesis, and entity panels can use the same data
          as the rest of the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder=""
          rows={12}
          className="min-h-[200px] font-mono text-xs bg-background/80 border-paper-edge"
          spellCheck={false}
          disabled={seeding || clearing}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onValidate} disabled={validating || seeding || clearing}>
            {validating ? "Validating…" : "Validate"}
          </Button>
          <Button type="button" variant="default" onClick={() => void onSeed()} disabled={seeding || validating || clearing}>
            {seeding ? "Seeding…" : "Seed"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => void onClear()}
            disabled={clearing || seeding || validating}
          >
            {clearing ? "Clearing…" : "Clear seeded entries"}
          </Button>
        </div>
        {status ? <p className="text-sm text-leather/90">{status}</p> : null}
        <p className="text-xs text-muted-foreground leading-relaxed">
          This only runs once per batch: seeding is blocked if any journal entry already contains{" "}
          <span className="font-mono text-[11px]">{SPIRITUAL_TIMELINE_SEED_MARKER}</span> in the body or tags. Look for
          that marker to find or remove seeded rows.
        </p>
      </CardContent>
    </Card>
  );
}
