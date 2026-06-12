import { useCallback, useState } from "react";
import {
  fetchLifeGuide,
  fetchLifeGuideFollowUp,
  pushRecentLifeGuide,
  readRecentLifeGuides,
  saveLifeGuideToJournal,
  saveLifeGuideToPlaybook,
  updateRecentLifeGuideFollowups,
  type LifeGuideFollowUp,
  type LifeGuideResult,
  type LifeGuideSession,
} from "@/lib/bible/lifeGuide";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export function useLifeGuide(bibleId: string, userId: string | undefined) {
  const [issue, setIssue] = useState("");
  const [busy, setBusy] = useState(false);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState<"journal" | "playbook" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LifeGuideResult | null>(null);
  const [followups, setFollowups] = useState<LifeGuideFollowUp[]>([]);
  const [recent, setRecent] = useState<LifeGuideSession[]>(() => readRecentLifeGuides());

  const search = useCallback(async (text?: string) => {
    const q = (text ?? issue).trim();
    if (!q || !bibleId) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setFollowups([]);
    try {
      const guide = await fetchLifeGuide(q, bibleId);
      setResult(guide);
      setIssue(q);
      setRecent(pushRecentLifeGuide(q, guide, []));
    } catch (e: unknown) {
      setError(await edgeFunctionErrorMessage("bible-life-guide", e));
    } finally {
      setBusy(false);
    }
  }, [issue, bibleId]);

  const askFollowUp = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || !bibleId || !result || !issue.trim()) return;
    setFollowUpBusy(true);
    setError(null);
    try {
      const resp = await fetchLifeGuideFollowUp({
        issue: issue.trim(),
        bibleId,
        question: q,
        guide: result,
        history: followups,
      });
      const turn: LifeGuideFollowUp = {
        question: q,
        answer: resp.answer,
        action_hint: resp.action_hint,
        new_passages: resp.new_passages,
      };
      const mergedGuide: LifeGuideResult = resp.new_passages?.length
        ? { ...result, passages: [...result.passages, ...resp.new_passages] }
        : result;
      const nextFollowups = [...followups, turn];
      setFollowups(nextFollowups);
      if (resp.new_passages?.length) setResult(mergedGuide);
      setRecent(updateRecentLifeGuideFollowups(issue.trim(), mergedGuide, nextFollowups));
    } catch (e: unknown) {
      setError(await edgeFunctionErrorMessage("bible-life-guide", e));
    } finally {
      setFollowUpBusy(false);
    }
  }, [bibleId, result, issue, followups]);

  const saveJournal = useCallback(async (): Promise<string | null> => {
    if (!userId || !result || !issue.trim()) return null;
    setSaveBusy("journal");
    setError(null);
    try {
      const id = await saveLifeGuideToJournal(userId, issue.trim(), result, followups);
      return id;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save to journal");
      return null;
    } finally {
      setSaveBusy(null);
    }
  }, [userId, result, issue, followups]);

  const savePlaybook = useCallback(async (): Promise<string | null> => {
    if (!userId || !result || !issue.trim()) return null;
    setSaveBusy("playbook");
    setError(null);
    try {
      const id = await saveLifeGuideToPlaybook(userId, issue.trim(), result);
      return id;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not add to playbook");
      return null;
    } finally {
      setSaveBusy(null);
    }
  }, [userId, result, issue]);

  const loadRecent = useCallback((session: LifeGuideSession) => {
    setIssue(session.issue);
    setResult(session.result);
    setFollowups(session.followups ?? []);
    setError(null);
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setFollowups([]);
    setError(null);
  }, []);

  return {
    issue,
    setIssue,
    busy,
    followUpBusy,
    saveBusy,
    error,
    result,
    followups,
    recent,
    search,
    askFollowUp,
    saveJournal,
    savePlaybook,
    loadRecent,
    clear,
  };
}
