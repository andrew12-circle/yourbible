import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import JournalsRail from "@/components/journal/JournalsRail";
import JournalDeskLayout from "@/components/journal/JournalDeskLayout";
import NotesListPane from "@/components/journal/NotesListPane";
import NotesEditorPane from "@/components/journal/NotesEditorPane";
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
  const [booting, setBooting] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setBooting(true);
      const [list, nid] = await Promise.all([
        ensureDefaultJournal(user.id),
        getNotesJournalId(user.id),
      ]);
      if (cancelled) return;
      setJournals(list);
      setNotesJournalId(nid);
      setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Notes notebook is unavailable. Try refreshing after database migrations finish.
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
          list={
            <NotesListPane
              notesJournalId={notesJournalId}
              selectedId={entryId}
              reloadKey={reloadKey}
              onSelect={(id) => navigate(`/journal/notes/e/${id}`)}
              onNew={() => void createNew()}
              onDeleted={(id) => {
                if (entryId === id) handleDeleted();
                else setReloadKey((k) => k + 1);
              }}
            />
          }
          editor={
            <NotesEditorPane
              entryId={entryId}
              notesJournalId={notesJournalId}
              onChanged={() => setReloadKey((k) => k + 1)}
              onDeleted={handleDeleted}
            />
          }
        />
      </div>
    );
  }

  if (entryId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <NotesEditorPane
          entryId={entryId}
          notesJournalId={notesJournalId}
          onChanged={() => setReloadKey((k) => k + 1)}
          onDeleted={handleDeleted}
          onClose={() => navigate("/journal/notes")}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <NotesListPane
        notesJournalId={notesJournalId}
        selectedId={null}
        reloadKey={reloadKey}
        onSelect={(id) => navigate(`/journal/notes/e/${id}`)}
        onNew={() => void createNew()}
      />
    </div>
  );
}
