import { useCallback, useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import {

  BookOpen,

  ChevronDown,

  ChevronRight,

  ImagePlus,

  Layers,

  Loader2,

  Move,

  Plus,

  FileUp,

} from "lucide-react";

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

  journalCoverObjectPosition,

  uploadAllEntriesCover,

} from "@/lib/journal/covers";

import JournalCoverBanner from "@/components/journal/JournalCoverBanner";

import { Button } from "@/components/ui/button";

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";

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



const ALL_ENTRIES_ACCENT = "hsl(211 100% 50%)";

const ALL_ENTRIES_TINT = "hsl(211 100% 50% / 0.14)";



export default function AllEntriesOverviewPane({ journals, reloadKey = 0, onNew, onImportDayOne }: Props) {

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

  }, [

    coverSettings.all_entries_cover_kind,

    coverSettings.all_entries_cover_value,

  ]);



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

    <div className="flex flex-col h-full overflow-y-auto bg-background">

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

        <GradientBanner onNew={onNew} onAddCover={() => coverInputRef.current?.click()} onImportDayOne={onImportDayOne} />

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



function GradientBanner({
  onNew,
  onAddCover,
  onRepositionCover,
  onImportDayOne,
  hasCoverPhoto,
  overlay,
}: {
  onNew: () => void;
  onAddCover: () => void;
  onRepositionCover?: () => void;
  onImportDayOne?: () => void;
  hasCoverPhoto?: boolean;
  overlay?: boolean;
}) {

  return (

    <div

      className={`relative flex-shrink-0 overflow-hidden ${

        overlay ? "h-44 sm:h-52" : ""

      }`}

      style={{

        background:

          "linear-gradient(165deg, hsl(220 14% 22%) 0%, hsl(220 14% 30%) 45%, hsl(211 100% 50% / 0.35) 100%)",

      }}

    >

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/50 via-black/15 to-transparent"
        aria-hidden
      />

      <OverviewHeader
        onNew={onNew}
        onAddCover={onAddCover}
        onRepositionCover={onRepositionCover}
        onImportDayOne={onImportDayOne}
        hasCoverPhoto={hasCoverPhoto}
        overlay={overlay}
      />

      <div
        className={`px-8 pb-8 ${overlay ? "pointer-events-none absolute bottom-0 left-0 right-0 z-[1] pb-6" : "relative pt-24"}`}
      >

        <AllEntriesIdentity large inverted />

      </div>

    </div>

  );

}



function OverviewHeader({

  onNew,

  onAddCover,

  onRepositionCover,

  onImportDayOne,

  hasCoverPhoto,

  repositioning,

  overlay,

}: {

  onNew: () => void;

  onAddCover: () => void;

  onRepositionCover?: () => void;

  onImportDayOne?: () => void;

  hasCoverPhoto?: boolean;

  repositioning?: boolean;

  overlay?: boolean;

}) {

  return (

    <div

      className={`flex items-center justify-between gap-3 ${

        overlay
          ? "pointer-events-auto absolute top-0 left-0 right-0 z-20 px-6 pt-5"
          : "px-8 pt-6"

      }`}

    >

      <DropdownMenu>

        <DropdownMenuTrigger asChild>

          <Button
            type="button"
            variant={overlay ? "secondary" : "outline"}

            size="sm"

            className={

              overlay

                ? "bg-white/15 text-white border-white/20 hover:bg-white/25 backdrop-blur-sm"

                : ""

            }

          >

            Edit

            <ChevronDown className="w-4 h-4 opacity-70" />

          </Button>

        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">

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

          {onImportDayOne && (

            <DropdownMenuItem onClick={onImportDayOne}>

              <FileUp className="w-4 h-4 mr-2" />

              Import from Day One

            </DropdownMenuItem>

          )}

        </DropdownMenuContent>

      </DropdownMenu>



      <Button
        type="button"
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



function AllEntriesIdentity({ large, inverted }: { large?: boolean; inverted?: boolean }) {

  return (

    <div className="flex items-center gap-4">

      <div

        className={`flex items-center justify-center rounded-2xl shadow-sm ${

          large ? "w-16 h-16" : "w-12 h-12"

        }`}

        style={{

          background: inverted ? "hsl(0 0% 100% / 0.2)" : ALL_ENTRIES_TINT,

        }}

      >

        <Layers

          className={large ? "w-8 h-8" : "w-6 h-6"}

          style={{ color: inverted ? "white" : ALL_ENTRIES_ACCENT }}

          strokeWidth={1.75}

        />

      </div>

      <div>

        <h1

          className={`font-bold tracking-tight ${

            large ? "text-4xl sm:text-[42px]" : "text-2xl"

          } ${inverted ? "text-white" : "text-foreground"}`}

        >

          All Entries

        </h1>

      </div>

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



function JournalRow({

  journal,

  entryCount,

  coverUrl,

  onOpen,

}: {

  journal: Journal;

  entryCount: number;

  coverUrl: string | null;

  onOpen: () => void;

}) {

  const hasPhoto = journal.cover_kind === "photo" && !!coverUrl;

  const objectPosition = journalCoverObjectPosition(journal);



  return (

    <li>

      <button

        type="button"

        onClick={onOpen}

        className="w-full flex items-center gap-4 py-3.5 text-left rounded-lg -mx-2 px-2 hover:bg-muted/40 transition-colors group"

      >

        <div

          className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm"

          style={

            hasPhoto

              ? undefined

              : {

                  background: `linear-gradient(135deg, hsl(${journal.color}), hsl(${journal.color} / 0.7))`,

                }

          }

        >

          {hasPhoto ? (

            <img

              src={coverUrl}

              alt=""

              className="absolute inset-0 w-full h-full object-cover"

              style={{ objectPosition }}

            />

          ) : (

            <div className="absolute inset-0 flex items-center justify-center">

              <BookOpen className="w-6 h-6 text-white/90" strokeWidth={1.75} />

            </div>

          )}

        </div>

        <div className="flex-1 min-w-0">

          <p className="text-[15px] font-semibold truncate text-foreground">{journal.name}</p>

          <p className="text-[13px] text-muted-foreground mt-0.5">

            {entryCount} {entryCount === 1 ? "entry" : "entries"}

          </p>

        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0" />

      </button>

    </li>

  );

}


