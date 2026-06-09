import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Journal } from "@/lib/journal/journals";
import { buildJournalOverviewStats, type JournalOverviewStats } from "@/lib/journal/journalStats";
import {
  allEntriesCoverFocal,
  allEntriesCoverFromProfile,
  hasAllEntriesCoverPhoto,
  updateAllEntriesCover,
} from "@/lib/journal/allEntriesCover";
import {
  DEFAULT_COVER_FOCAL,
  getJournalCoverUrl,
  uploadAllEntriesCover,
} from "@/lib/journal/covers";
import JournalCoverBanner from "@/components/journal/JournalCoverBanner";
import AllEntriesIdentity from "@/components/journal/overview/AllEntriesIdentity";
import GradientBanner from "@/components/journal/overview/GradientBanner";
import JournalRow from "@/components/journal/overview/JournalRow";
import OverviewHeader from "@/components/journal/overview/OverviewHeader";
import StatsRow from "@/components/journal/overview/StatsRow";
import { ALL_ENTRIES_ACCENT } from "@/components/journal/overview/overviewConstants";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Props {
  journals: Journal[];
  reloadKey?: number;
  onNew: () => void;
  onImportDayOne?: () => void;
}

const EMPTY_STATS: JournalOverviewStats = {
  entryCount: 0,
  mediaCount: 0,
  dayCount: 0,
  streak: 0,
  yearRange: null,
};

export default function AllEntriesOverviewPane({
  journals,
  reloadKey = 0,
  onNew,
  onImportDayOne,
}: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<JournalOverviewStats>(EMPTY_STATS);
  const [countsByJournal, setCountsByJournal] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [uploadingCover, setUploadingCover] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [savedFocal, setSavedFocal] = useState(() =>
    allEntriesCoverFocal(allEntriesCoverFromProfile(profile ?? undefined)),
  );
  const [draftFocal, setDraftFocal] = useState(() =>
    allEntriesCoverFocal(allEntriesCoverFromProfile(profile ?? undefined)),
  );
  const [savingFocal, setSavingFocal] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const coverSettings = allEntriesCoverFromProfile(profile ?? undefined);
  const hasCoverBanner = hasAllEntriesCoverPhoto(coverSettings);
  const displayFocal = repositioning ? draftFocal : savedFocal;

  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id,entry_at_ts,journal_id")
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

    const byJournal: Record<string, number> = {};
    for (const e of list) {
      if (!e.journal_id) continue;
      byJournal[e.journal_id] = (byJournal[e.journal_id] ?? 0) + 1;
    }

    setStats(
      buildJournalOverviewStats(
        list.map((e) => e.entry_at_ts),
        mediaCount,
      ),
    );
    setCountsByJournal(byJournal);
    setLoading(false);
  }, [user]);

  const loadJournalRowCovers = useCallback(async () => {
    const photoJournals = journals.filter((j) => j.cover_kind === "photo" && j.cover_value);
    const urls: Record<string, string> = {};
    await Promise.all(
      photoJournals.map(async (j) => {
        const url = await getJournalCoverUrl(j.cover_value);
        if (url) urls[j.id] = url;
      }),
    );
    setCoverUrls(urls);
  }, [journals]);

  const loadAllEntriesCover = useCallback(async () => {
    if (hasAllEntriesCoverPhoto(coverSettings)) {
      const url = await getJournalCoverUrl(coverSettings.all_entries_cover_value);
      setCoverUrl(url);
    } else {
      setCoverUrl(null);
    }
  }, [coverSettings.all_entries_cover_kind, coverSettings.all_entries_cover_value]);

  useEffect(() => {
    loadStats();
  }, [loadStats, reloadKey]);

  useEffect(() => {
    loadJournalRowCovers();
  }, [loadJournalRowCovers]);

  useEffect(() => {
    loadAllEntriesCover();
  }, [loadAllEntriesCover]);

  useEffect(() => {
    const focal = allEntriesCoverFocal(coverSettings);
    setRepositioning(false);
    setSavedFocal(focal);
    setDraftFocal(focal);
  }, [profile?.all_entries_cover_kind, profile?.all_entries_cover_value]);

  useEffect(() => {
    if (repositioning) return;
    const focal = allEntriesCoverFocal(coverSettings);
    setSavedFocal(focal);
    setDraftFocal(focal);
  }, [
    profile?.all_entries_cover_focal_x,
    profile?.all_entries_cover_focal_y,
    repositioning,
  ]);

  const onPickCover = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setUploadingCover(true);
    try {
      const path = await uploadAllEntriesCover(user.id, files[0]);
      await updateAllEntriesCover(user.id, {
        all_entries_cover_kind: "photo",
        all_entries_cover_value: path,
        all_entries_cover_focal_x: DEFAULT_COVER_FOCAL.x,
        all_entries_cover_focal_y: DEFAULT_COVER_FOCAL.y,
      });
      await refreshProfile();
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

  const startReposition = () => {
    setDraftFocal(savedFocal);
    setRepositioning(true);
  };

  const cancelReposition = () => {
    setDraftFocal(savedFocal);
    setRepositioning(false);
  };

  const saveReposition = async () => {
    if (!user) return;
    setSavingFocal(true);
    try {
      await updateAllEntriesCover(user.id, {
        all_entries_cover_focal_x: draftFocal.x,
        all_entries_cover_focal_y: draftFocal.y,
      });
      setSavedFocal(draftFocal);
      setRepositioning(false);
      await refreshProfile();
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
          <div className="relative flex-shrink-0">
            <JournalCoverBanner
              coverUrl={coverUrl}
              focalX={displayFocal.x}
              focalY={displayFocal.y}
              repositioning={repositioning}
              onFocalChange={(x, y) => setDraftFocal({ x, y })}
            >
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
                  <AllEntriesIdentity large inverted />
                </div>
              )}
            </JournalCoverBanner>
            <OverviewHeader
              onNew={onNew}
              onAddCover={() => coverInputRef.current?.click()}
              onRepositionCover={startReposition}
              onImportDayOne={onImportDayOne}
              hasCoverPhoto
              repositioning={repositioning}
              overlay
            />
          </div>
        ) : (
          <GradientBanner
            onNew={onNew}
            onAddCover={() => coverInputRef.current?.click()}
            onRepositionCover={startReposition}
            onImportDayOne={onImportDayOne}
            hasCoverPhoto
            overlay
          />
        )
      ) : (
        <GradientBanner
          onNew={onNew}
          onAddCover={() => coverInputRef.current?.click()}
          onImportDayOne={onImportDayOne}
        />
      )}

      <div className={`px-8 ${hasCoverBanner ? "pt-6" : "pt-2"} pb-4 max-w-2xl`}>
        {!hasCoverBanner && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-6">
            All entries overview
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
          <StatsRow stats={stats} accent={ALL_ENTRIES_ACCENT} />
        )}
      </div>

      <div className="px-8 pb-10 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
          Journals
        </p>
        {journals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No journals yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {journals.map((j) => (
              <JournalRow
                key={j.id}
                journal={j}
                entryCount={countsByJournal[j.id] ?? 0}
                coverUrl={coverUrls[j.id] ?? null}
                onOpen={() => navigate(`/journal/j/${j.id}`)}
              />
            ))}
          </ul>
        )}
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onPickCover(e.target.files)}
      />

      {uploadingCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
