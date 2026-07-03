import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkJournal: (entryId: string, title: string) => void | Promise<void>;
  onLinkArtifact: (artifactId: string, title: string) => void | Promise<void>;
  onLinkVerse: (verseRef: string) => void | Promise<void>;
};

export default function PrayerLinkPicker({
  userId,
  open,
  onOpenChange,
  onLinkJournal,
  onLinkArtifact,
  onLinkVerse,
}: Props) {
  const [query, setQuery] = useState("");
  const [verseDraft, setVerseDraft] = useState("");
  const [journalRows, setJournalRows] = useState<{ id: string; title: string | null; entry_at_ts: string }[]>([]);
  const [artifactRows, setArtifactRows] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    void (async () => {
      const [j, a] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id,title,entry_at_ts")
          .eq("user_id", userId)
          .or("entry_kind.is.null,entry_kind.neq.vent")
          .order("entry_at_ts", { ascending: false })
          .limit(40),
        supabase
          .from("artifacts")
          .select("id,title")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(40),
      ]);
      setJournalRows((j.data as typeof journalRows) ?? []);
      setArtifactRows((a.data as typeof artifactRows) ?? []);
    })();
  }, [open, userId]);

  const q = query.trim().toLowerCase();
  const filteredJournal = journalRows.filter((r) =>
    !q ? true : (r.title ?? "").toLowerCase().includes(q),
  );
  const filteredArtifacts = artifactRows.filter((r) => r.title.toLowerCase().includes(q) || !q);

  const pickJournal = async (id: string, title: string | null) => {
    setBusy(true);
    try {
      await onLinkJournal(id, title?.trim() || "Journal entry");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const pickArtifact = async (id: string, title: string) => {
    setBusy(true);
    try {
      await onLinkArtifact(id, title);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const pickVerse = async () => {
    const ref = verseDraft.trim();
    if (!ref) return;
    setBusy(true);
    try {
      await onLinkVerse(ref);
      setVerseDraft("");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link to this prayer</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="journal" className="min-h-0 flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="artifact">Media</TabsTrigger>
            <TabsTrigger value="verse">Scripture</TabsTrigger>
          </TabsList>
          <TabsContent value="journal" className="min-h-0 flex-1 overflow-y-auto space-y-2 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entries"
                className="pl-9"
              />
            </div>
            <ul className="divide-y divide-border/50">
              {filteredJournal.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={busy}
                    className="w-full px-1 py-2.5 text-left text-sm hover:bg-muted/60 rounded-md"
                    onClick={() => void pickJournal(row.id, row.title)}
                  >
                    <span className="font-medium">{row.title?.trim() || "Untitled"}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(row.entry_at_ts).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </TabsContent>
          <TabsContent value="artifact" className="min-h-0 flex-1 overflow-y-auto space-y-2 mt-3">
            <ul className="divide-y divide-border/50">
              {filteredArtifacts.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={busy}
                    className="w-full px-1 py-2.5 text-left text-sm hover:bg-muted/60 rounded-md"
                    onClick={() => void pickArtifact(row.id, row.title)}
                  >
                    {row.title}
                  </button>
                </li>
              ))}
            </ul>
          </TabsContent>
          <TabsContent value="verse" className="space-y-3 mt-3">
            <Input
              value={verseDraft}
              onChange={(e) => setVerseDraft(e.target.value)}
              placeholder="James 1:5"
              onKeyDown={(e) => {
                if (e.key === "Enter") void pickVerse();
              }}
            />
            <Button disabled={busy || !verseDraft.trim()} onClick={() => void pickVerse()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add scripture"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
