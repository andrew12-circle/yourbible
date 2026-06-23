import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import JournalsRail from "@/components/journal/JournalsRail";
import JournalDeskLayout from "@/components/journal/JournalDeskLayout";
import EntryListPane from "@/components/journal/EntryListPane";
import EntryEditorPane from "@/components/journal/EntryEditorPane";
import { useIsDesktop } from "@/hooks/use-desktop";
import { ensureDefaultJournal, Journal } from "@/lib/journal/journals";
import { createNoteEntry, getNotesJournalId } from "@/lib/journal/notesJournal";
import { toast } from "@/hooks/use-toast";

export default function JournalNotesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ entryId?: string }>();
  const entryId = params.entryId ?? null;
  const isDesktop = useIsDesktop();

  const [journals, setJournals] = useState<Journal[]>([]);
  const [notesJournalId, setNotesJournalId] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    setBooting(true);
    setBootError(null);
    try {
      const [list, nid] = await Promise.all([
        ensureDefaultJournal(user.id),
        getNotesJournalId(user.id),
      ]);
      setJournals(list);
      setNotesJournalId(nid);
      if (!nid) {
        setBootError("Could not create the Notes notebook. Check your connection and try again.");
      }
    } catch (e) {
      setBootError(e instanceof Error ? e.message : "Couldn't load Notes.");
    } finally {
      setBooting(false);
    }
  }, [user]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const refreshJournals = useCallback(async () => {
    if (!user) return;
    setJournals(await ensureDefaultJournal(user.id));
  }, [user]);

  const createNew = async () => {
    if (!user || !notesJournalId || creating) return;
    setCreating(true);
    try {
      const id = await createNoteEntry(user.id, notesJournalId);
      if (!id) {
        toast({ title: "Couldn't create note", variant: "destructive" });
        return;
      }
      setReloadKey((k) => k + 1);
      navigate(`/journal/notes/e/${id}`);
    } catch (e) {
      toast({
        title: "Couldn't create note",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleted = () => {
    setReloadKey((k) => k + 1);
    navigate("/journal/notes");
  };

  const listPane = notesJournalId ? (
    <EntryListPane
      journalId={notesJournalId}
      selectedId={entryId}
      reloadKey={reloadKey}
      headingLabel="Notes"
      onSelect={(id) => navigate(`/journal/notes/e/${id}`)}
      onNew={() => void createNew()}
      onDeleted={(id) => {
        if (entryId === id) handleDeleted();
        else setReloadKey((k) => k + 1);
      }}
    />
  ) : null;

  const editorPane = (
    <EntryEditorPane
      entryId={entryId}
      journals={journals}
      onChanged={() => setReloadKey((k) => k + 1)}
      onClose={() => navigate("/journal/notes")}
      onNew={() => void createNew()}
      onDeleted={handleDeleted}
    />
  );

  if (loading || booting) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!notesJournalId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[15px] font-medium">Notes isn&apos;t ready yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {bootError ??
            "We couldn't open your Notes notebook. If you recently deployed, run `supabase db push` for the latest migrations, then retry."}
        </p>
        <Button variant="outline" size="sm" onClick={() => void loadNotes()}>
          Try again
        </Button>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <JournalDeskLayout
          sidebar={
            <JournalsRail
              inDesk
              journals={journals}
              activeJournalId={null}
              onChange={() => {
                void refreshJournals();
                setReloadKey((k) => k + 1);
              }}
            />
          }
          list={listPane}
          editor={editorPane}
        />
      </div>
    );
  }

  if (entryId) {
    return <div className="flex min-h-0 flex-1 flex-col">{editorPane}</div>;
  }

  return <div className="flex min-h-0 flex-1 flex-col">{listPane}</div>;
}
