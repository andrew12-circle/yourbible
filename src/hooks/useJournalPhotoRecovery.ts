import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
type Photo = { id: string; storage_path: string; url?: string };
/** A successful explicit retry updates the open entry without remounting it. */
export function useJournalPhotoRecovery(userId: string | undefined, entryId: string | null, onRecovered: (photos: Photo[]) => void) {
  const callback = useRef(onRecovered); callback.current = onRecovered;
  useEffect(() => {
    let alive = true, generation = 0;
    const recovered = () => {
      const epoch = useJournalVaultStore.getState().lockEpoch, request = ++generation;
      if (!userId || !entryId || useJournalVaultStore.getState().locking) return;
      void (async () => {
        const { data, error } = await supabase.from("journal_photos").select("id,storage_path")
          .eq("user_id", userId).eq("entry_id", entryId).order("created_at");
        if (error) throw error;
        const urls = await getSignedPhotoUrls((data ?? []).map((photo) => photo.storage_path));
        if (alive && request === generation && useJournalVaultStore.getState().lockEpoch === epoch && !useJournalVaultStore.getState().locking) {
          callback.current((data ?? []).map((photo) => ({ ...photo, url: urls[photo.storage_path] })));
        }
      })().catch(() => {}); // A failed optional refresh retains the current visible photos.
    };
    window.addEventListener("yourbible:journal-attachments-recovered", recovered);
    return () => { alive = false; window.removeEventListener("yourbible:journal-attachments-recovered", recovered); };
  }, [userId, entryId]);
}
