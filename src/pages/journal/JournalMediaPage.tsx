import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
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

export default function JournalMediaPage() {
  const { user, loading } = useAuth();
  const { journalId: paramJournalId } = useParams<{ journalId?: string }>();
  const journalId = paramJournalId ?? null;
  const [photos, setPhotos] = useState<(PhotoRow & { url?: string })[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get entries optionally scoped, then fetch their photos
      let entryQ = supabase
        .from("journal_entries")
        .select("id")
        .or("entry_kind.is.null,entry_kind.neq.vent");
      if (journalId) entryQ = entryQ.eq("journal_id", journalId);
      const { data: entries } = await entryQ.limit(1000);
      const ids = (entries ?? []).map((e: { id: string }) => e.id);
      if (!ids.length) return setPhotos([]);
      const { data } = await supabase
        .from("journal_photos")
        .select("id,entry_id,storage_path,created_at")
        .in("entry_id", ids)
        .order("created_at", { ascending: false })
        .limit(500);
      const rows = (data as PhotoRow[]) ?? [];
      const urls = await getSignedPhotoUrls(rows.map((p) => p.storage_path));
      setPhotos(rows.map((p) => ({ ...p, url: urls[p.storage_path] })));
    })();
  }, [user, journalId]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalShell journalId={journalId} activeTab="media" totalCount={photos.length}>
      {photos.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="text-lg font-semibold tracking-tight">No media yet</p>
          <p className="text-[15px] text-muted-foreground mt-1">
            Photos you add to entries will appear here.
          </p>
        </div>
      ) : (
        <div className="px-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
          {photos.map((p) =>
            p.url ? (
              <Link
                key={p.id}
                to={`/journal/${p.entry_id}`}
                className="aspect-square overflow-hidden rounded-md group"
              >
                <img
                  src={p.url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </Link>
            ) : null,
          )}
        </div>
      )}
    </JournalShell>
  );
}
