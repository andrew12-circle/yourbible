import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  FileUp,
  ImagePlus,
  Link2,
  Loader2,
  Move,
  Plus,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Journal, journalCss, journalCssTint, updateJournal } from "@/lib/journal/journals";
import { buildJournalOverviewStats, type JournalOverviewStats } from "@/lib/journal/journalStats";
import {
  DEFAULT_COVER_FOCAL,
  getJournalCoverUrl,
  journalCoverFocal,
  uploadJournalCover,
} from "@/lib/journal/covers";
import JournalCoverBanner from "@/components/journal/JournalCoverBanner";
import JournalSettingsDialog from "@/components/journal/JournalSettingsDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface Props {
  journal: Journal;
  reloadKey?: number;
  onNew: () => void;
  onJournalChange: () => void;
  onImportDayOne?: () => void;
}

const EMPTY_STATS: JournalOverviewStats = {
  entryCount: 0,
  mediaCount: 0,
  dayCount: 0,
  streak: 0,
  yearRange: null,
};

export default function JournalOverviewPane({
  journal,
  reloadKey = 0,
  onNew,
  onJournalChange,
  onImportDayOne,
}: Props) {
  const { user } = useAuth();
  const [stats, setStats] = useState<JournalOverviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [savedFocal, setSavedFocal] = useState(() => journalCoverFocal(journal));
  const [draftFocal, setDraftFocal] = useState(() => journalCoverFocal(journal));
  const [savingFocal, setSavingFocal] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id,entry_at_ts")
      .eq("journal_id", journal.id)
      .or("entry_kind.is.null,entry_kind.neq.vent");

    const list = entries ?? [];
    const entryIds = list.map((e) => e.id);
    let mediaCount = 0;
    if (entryIds.length) {
      const { count } = await supabase
        .from("journal_photos")
        .select("id", { count: "exact", head: true })
        .in("entry_id", entryIds);
      mediaCount = count ?? 0;
    }

    setStats(
      buildJournalOverviewStats(
        list.map((e) => e.entry_at_ts),
        mediaCount,
      ),
    );
    setLoading(false);
  }, [user, journal.id]);

  const loadCover = useCallback(async () => {
    if (journal.cover_kind === "photo" && journal.cover_value) {
      const url = await getJournalCoverUrl(journal.cover_value);
      setCoverUrl(url);
    } else {
      setCoverUrl(null);
    }
  }, [journal.cover_kind, journal.cover_value]);

  useEffect(() => {
    loadStats();
  }, [loadStats, reloadKey]);

  useEffect(() => {
    loadCover();
  }, [loadCover]);

  useEffect(() => {
    const focal = journalCoverFocal(journal);
    setRepositioning(false);
    setSavedFocal(focal);
    setDraftFocal(focal);
  }, [journal.id]);

  useEffect(() => {
    if (repositioning) return;
    const focal = journalCoverFocal(journal);
    setSavedFocal(focal);
    setDraftFocal(focal);
  }, [journal.cover_focal_x, journal.cover_focal_y, repositioning]);

  const copyJournalUrl = async () => {
    const url = `${window.location.origin}/journal/j/${journal.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Journal link copied" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  const onPickCover = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setUploadingCover(true);
    try {
      const path = await uploadJournalCover(user.id, journal.id, files[0]);
      await updateJournal(journal.id, {
        cover_kind: "photo",
        cover_value: path,
        cover_focal_x: DEFAULT_COVER_FOCAL.x,
        cover_focal_y: DEFAULT_COVER_FOCAL.y,
      });
      onJournalChange();
      const url = await getJournalCoverUrl(path);
      setCoverUrl(url);
      toast({ title: "Cover image updated" });
    } catch (e) {
      toast({
        title: "Cover upload failed",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const hasCoverBanner = journal.cover_kind === "photo" && !!journal.cover_value;
  const accent = journalCss(journal);
  const tint = journalCssTint(journal, 0.14);
  const displayFocal = repositioning ? draftFocal : savedFocal;

  const startReposition = () => {
    setDraftFocal(savedFocal);
    setRepositioning(true);
  };

  const cancelReposition = () => {
    setDraftFocal(savedFocal);
    setRepositioning(false);
  };

  const saveReposition = async () => {
    setSavingFocal(true);
    try {
      await updateJournal(journal.id, {
        cover_focal_x: draftFocal.x,
        cover_focal_y: draftFocal.y,
      });
      setSavedFocal(draftFocal);
      setRepositioning(false);
      await Promise.resolve(onJournalChange());
      toast({ title: "Cover position saved" });
    } catch (e) {
      toast({
        title: "Couldn't save cover position",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setSavingFocal(false);
    }
  };

  return (
    <div className="journal-pane-scroll flex h-full min-h-0 flex-col overflow-y-auto bg-background">
      {hasCoverBanner ? (
        coverUrl ? (
          <JournalCoverBanner
            coverUrl={coverUrl}
            focalX={displayFocal.x}
            focalY={displayFocal.y}
            repositioning={repositioning}
            onFocalChange={(x, y) => setDraftFocal({ x, y })}
          >
            <OverviewHeader
              onNew={onNew}
              onSettings={() => setSettingsOpen(true)}
              onAddCover={() => coverInputRef.current?.click()}
              onRepositionCover={startReposition}
              onCopyUrl={copyJournalUrl}
              onImportDayOne={onImportDayOne}
              hasCoverPhoto
              repositioning={repositioning}
              overlay
            />
            {repositioning ? (
              <div
                className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-2 px-6 pb-5 pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/15 text-white border-white/20 hover:bg-white/25 backdrop-blur-sm"
                  onClick={cancelReposition}
                  disabled={savingFocal}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-white text-foreground hover:bg-white/90"
                  onClick={saveReposition}
                  disabled={savingFocal}
                >
                  {savingFocal ? "Saving…" : "Save position"}
                </Button>
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 right-0 px-8 pb-6 pointer-events-none">
                <JournalIdentity journal={journal} large inverted />
              </div>
            )}
          </JournalCoverBanner>
        ) : (
          <div className="relative h-44 sm:h-52 flex-shrink-0 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, hsl(${journal.color}), hsl(${journal.color} / 0.65))`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/10" />
            <OverviewHeader
              onNew={onNew}
              onSettings={() => setSettingsOpen(true)}
              onAddCover={() => coverInputRef.current?.click()}
              onCopyUrl={copyJournalUrl}
              onImportDayOne={onImportDayOne}
              overlay
            />
            <div className="absolute bottom-0 left-0 right-0 px-8 pb-6">
              <JournalIdentity journal={journal} large inverted />
            </div>
          </div>
        )
      ) : (
        <div
          className="relative flex-shrink-0 px-8 pt-6 pb-10"
          style={{
            background: `linear-gradient(165deg, ${tint} 0%, hsl(${journal.color} / 0.08) 45%, transparent 100%)`,
          }}
        >
          <OverviewHeader
            onNew={onNew}
            onSettings={() => setSettingsOpen(true)}
            onAddCover={() => coverInputRef.current?.click()}
            onCopyUrl={copyJournalUrl}
            onImportDayOne={onImportDayOne}
          />
          <div className="mt-10">
            <JournalIdentity journal={journal} large />
          </div>
        </div>
      )}

      <div className={`px-8 ${hasCoverBanner ? "pt-6" : "pt-2"} pb-10 max-w-2xl`}>
        {!hasCoverBanner && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-6">
            Journal overview
          </p>
        )}

        {stats.yearRange && (
          <p className="text-[15px] text-muted-foreground mb-5">{stats.yearRange}</p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading stats…</span>
          </div>
        ) : (
          <StatsRow stats={stats} accent={accent} />
        )}
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onPickCover(e.target.files)}
      />

      <JournalSettingsDialog
        journal={journal}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={onJournalChange}
      />

      {uploadingCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function OverviewHeader({
  onNew,
  onSettings,
  onAddCover,
  onRepositionCover,
  onCopyUrl,
  onImportDayOne,
  hasCoverPhoto,
  repositioning,
  overlay,
}: {
  onNew: () => void;
  onSettings: () => void;
  onAddCover: () => void;
  onRepositionCover?: () => void;
  onCopyUrl: () => void;
  onImportDayOne?: () => void;
  hasCoverPhoto?: boolean;
  repositioning?: boolean;
  overlay?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        overlay ? "absolute top-0 left-0 right-0 z-10 px-6 pt-5" : ""
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={overlay ? "secondary" : "outline"}
            size="sm"
            className={
              overlay
                ? "bg-white/15 text-white border-white/20 hover:bg-white/25 backdrop-blur-sm"
                : ""
            }
          >
            Edit Journal
            <ChevronDown className="w-4 h-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={onSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Journal Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddCover}>
            <ImagePlus className="w-4 h-4 mr-2" />
            {hasCoverPhoto ? "Change Cover Image" : "Add Cover Image"}
          </DropdownMenuItem>
          {hasCoverPhoto && onRepositionCover && (
            <DropdownMenuItem onClick={onRepositionCover} disabled={repositioning}>
              <Move className="w-4 h-4 mr-2" />
              Reposition Cover
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onCopyUrl}>
            <Link2 className="w-4 h-4 mr-2" />
            Copy Journal URL
          </DropdownMenuItem>
          {onImportDayOne && (
            <DropdownMenuItem onClick={onImportDayOne}>
              <FileUp className="w-4 h-4 mr-2" />
              Import from Day One
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        onClick={onNew}
        size="sm"
        className={
          overlay
            ? "bg-[hsl(211_100%_50%)] hover:bg-[hsl(211_100%_46%)] text-white shadow-md"
            : "bg-[hsl(211_100%_50%)] hover:bg-[hsl(211_100%_46%)] text-white"
        }
      >
        <Plus className="w-4 h-4" />
        New Entry
      </Button>
    </div>
  );
}

function JournalIdentity({
  journal,
  large,
  inverted,
}: {
  journal: Journal;
  large?: boolean;
  inverted?: boolean;
}) {
  const accent = journalCss(journal);
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex items-center justify-center rounded-2xl shadow-sm ${
          large ? "w-16 h-16" : "w-12 h-12"
        }`}
        style={{ background: journalCssTint(journal, inverted ? 0.35 : 0.2) }}
      >
        <BookOpen
          className={large ? "w-8 h-8" : "w-6 h-6"}
          style={{ color: inverted ? "white" : accent }}
          strokeWidth={1.75}
        />
      </div>
      <h1
        className={`font-bold tracking-tight ${
          large ? "text-4xl sm:text-[42px]" : "text-2xl"
        } ${inverted ? "text-white" : "text-foreground"}`}
      >
        {journal.name}
      </h1>
    </div>
  );
}

function StatsRow({ stats, accent }: { stats: JournalOverviewStats; accent: string }) {
  const items = [
    { value: stats.entryCount, label: "Entries" },
    { value: stats.mediaCount, label: "Media" },
    { value: stats.dayCount, label: "Days" },
    { value: stats.streak, label: "Streak" },
  ];
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4">
      {items.map(({ value, label }) => (
        <div key={label}>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: accent }}>
            {value}
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}
