import { useCallback, useState } from "react";
import {
  fetchLifeGuide,
  pushRecentLifeGuide,
  readRecentLifeGuides,
  type LifeGuideResult,
  type LifeGuideSession,
} from "@/lib/bible/lifeGuide";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export function useLifeGuide(bibleId: string) {
  const [issue, setIssue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LifeGuideResult | null>(null);
  const [recent, setRecent] = useState<LifeGuideSession[]>(() => readRecentLifeGuides());

  const search = useCallback(async (text?: string) => {
    const q = (text ?? issue).trim();
    if (!q || !bibleId) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const guide = await fetchLifeGuide(q, bibleId);
      setResult(guide);
      setIssue(q);
      setRecent(pushRecentLifeGuide(q, guide));
    } catch (e: unknown) {
      setError(await edgeFunctionErrorMessage("bible-life-guide", e));
    } finally {
      setBusy(false);
    }
  }, [issue, bibleId]);

  const loadRecent = useCallback((session: LifeGuideSession) => {
    setIssue(session.issue);
    setResult(session.result);
    setError(null);
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    issue,
    setIssue,
    busy,
    error,
    result,
    recent,
    search,
    loadRecent,
    clear,
  };
}
