import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { passageQueryKey } from "@/hooks/usePassage";
import { fetchPassageWithCache } from "@/lib/bible/fetchPassageWithCache";
import { toast } from "@/hooks/use-toast";

/** Keep the current, correctly labelled chapter until the target text is available. */
export function useReaderChapterNavigation(bibleId: string, bibleAbbr?: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const sequence = useRef(0);
  const [pending, setPending] = useState(false);
  useEffect(() => { sequence.current += 1; setPending(false); return () => { sequence.current += 1; }; }, [bibleId, location.pathname]);
  const openChapter = useCallback(async (bookAbbr: string, chapter: number, enterAtEnd = false, state?: unknown, verse?: number) => {
    if (!bibleId) return;
    const request = ++sequence.current;
    setPending(true);
    try {
      await client.fetchQuery({ queryKey: passageQueryKey(bibleId, bookAbbr, chapter), queryFn: ({ signal }) => fetchPassageWithCache(bibleId, bookAbbr, chapter, signal, bibleAbbr), staleTime: 7 * 24 * 60 * 60 * 1000 });
      if (request !== sequence.current) return;
      const previous = state ?? location.state;
      navigate(`/read/${bookAbbr}/${chapter}${verse && verse > 0 ? `?v=${verse}` : ""}`, { state: { ...(previous && typeof previous === "object" ? previous : {}), readerEnterAtEnd: enterAtEnd } });
    } catch (error) {
      if (request !== sequence.current) return;
      toast({ title: "Couldn't open that chapter", description: error instanceof Error ? error.message : "Your current page is still available. Try again.", variant: "destructive" });
    } finally { if (request === sequence.current) setPending(false); }
  }, [bibleId, bibleAbbr, client, location.state, navigate]);
  return { openChapter, pending };
}
