import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  allEntriesCoverFromProfile,
  allEntriesCoverFocal,
  hasAllEntriesCoverPhoto,
} from "@/lib/journal/allEntriesCover";
import { getJournalCoverUrl, journalCoverFocal } from "@/lib/journal/covers";
import type { Journal } from "@/lib/journal/journals";

/** Resolves cover photo URL + focal point for JournalCover (All Entries or a journal). */
export function useJournalCoverBanner(journal: Journal | null) {
  const { profile } = useAuth();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const focal = useMemo(() => {
    if (journal?.cover_kind === "photo") return journalCoverFocal(journal);
    if (!journal) return allEntriesCoverFocal(allEntriesCoverFromProfile(profile ?? undefined));
    return journalCoverFocal(journal);
  }, [journal, profile]);

  const storagePath = useMemo(() => {
    if (journal?.cover_kind === "photo" && journal.cover_value) return journal.cover_value;
    if (!journal) {
      const settings = allEntriesCoverFromProfile(profile ?? undefined);
      if (hasAllEntriesCoverPhoto(settings)) return settings.all_entries_cover_value;
    }
    return null;
  }, [
    journal,
    profile?.all_entries_cover_kind,
    profile?.all_entries_cover_value,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = storagePath ? await getJournalCoverUrl(storagePath) : null;
      if (!cancelled) setCoverUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  return { coverUrl, focal, hasPhoto: !!coverUrl };
}
