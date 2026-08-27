import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Film, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import { getSignedPhotoUrls } from "@/lib/journal/photos";

interface PhotoRow {
  id: string;
  entry_id: string;
  storage_path: string;
  created_at: string;
}

interface VideoRow {
  id: string;
  entry_id: string;
  storage_path: string;
  created_at: string;
  mime_type: string | null;
}

type MediaItem =
  | (PhotoRow & { kind: "photo"; url?: string })
  | (VideoRow & { kind: "video"; url?: string });

export default function JournalMediaPage() {
  const { user, loading } = useAuth();
  const { journalId: paramJournalId } = useParams<{ journalId?: string }>();
  const journalId = paramJournalId ?? null;
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setMedia([]);
    setMediaError(null);
    setMediaLoading(true);
    void (async () => {
      // Get entries optionally scoped, then fetch their photos
      let entryQ = supabase
        .from("journal_entries")
        .select("id")
        .eq("user_id", user.id)
        .or("entry_kind.is.null,entry_kind.neq.vent");
      if (journalId) entryQ = entryQ.eq("journal_id", journalId);
      const { data: entries, error: entryError } = await entryQ
        .order("entry_at_ts", { ascending: false })
        .limit(1000);
      if (entryError) throw entryError;
      const ids = (entries ?? []).map((e: { id: string }) => e.id);
      if (!ids.length) return;
      const idBatches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) =>
        ids.slice(index * 100, index * 100 + 100),
      );
      const [photoResults, videoResults] = await Promise.all([
        Promise.all(
          idBatches.map((batch) =>
            supabase
              .from("journal_photos")
              .select("id,entry_id,storage_path,created_at")
              .in("entry_id", batch)
              .order("created_at", { ascending: false })
              .limit(500),
          ),
        ),
        Promise.all(
          idBatches.map((batch) =>
            supabase
              .from("journal_videos")
              .select("id,entry_id,storage_path,created_at,mime_type")
              .in("entry_id", batch)
              .order("created_at", { ascending: false })
              .limit(200),
          ),
        ),
      ]);
      const mediaQueryError =
        photoResults.find((result) => result.error)?.error ??
        videoResults.find((result) => result.error)?.error;
      if (mediaQueryError) throw mediaQueryError;
      const photos = photoResults
        .flatMap((result) => (result.data as PhotoRow[]) ?? [])
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 500);
      const videos = videoResults
        .flatMap((result) => (result.data as VideoRow[]) ?? [])
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 200);
      const photoUrls = await getSignedPhotoUrls(photos.map((item) => item.storage_path));
      if (cancelled) return;
      setMedia(
        [
          ...photos.map((item) => ({
            ...item,
            kind: "photo" as const,
            url: photoUrls[item.storage_path],
          })),
          ...videos.map((item) => ({
            ...item,
            kind: "video" as const,
          })),
        ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
      );
    })()
      .catch((error) => {
        if (!cancelled) {
          setMediaError(error instanceof Error ? error.message : "Could not load journal media.");
        }
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, journalId]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalShell journalId={journalId} activeTab="media" totalCount={media.length}>
      {mediaLoading ? (
        <div className="flex justify-center py-20" aria-label="Loading journal media">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : mediaError ? (
        <div className="px-6 py-20 text-center" role="alert">
          <p className="text-lg font-semibold tracking-tight">Media couldn&apos;t load</p>
          <p className="mt-1 text-[15px] text-muted-foreground">{mediaError}</p>
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="text-lg font-semibold tracking-tight">No media yet</p>
          <p className="text-[15px] text-muted-foreground mt-1">
            Photos and video journals you add to entries will appear here.
          </p>
        </div>
      ) : (
        <div className="px-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
          {media.map((item) =>
            item.kind === "video" || item.url ? (
              <Link
                key={`${item.kind}-${item.id}`}
                to={`/journal/${item.entry_id}`}
                className="group relative aspect-square min-h-11 overflow-hidden rounded-md bg-black"
                aria-label={`Open journal entry with ${item.kind}`}
              >
                {item.kind === "photo" ? (
                  <img
                    src={item.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-950 via-slate-800 to-amber-950 text-white">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                      <Film className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                      Video journal
                    </span>
                  </div>
                )}
              </Link>
            ) : null,
          )}
        </div>
      )}
    </JournalShell>
  );
}
