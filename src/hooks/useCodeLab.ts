import { useCallback, useMemo, useRef, useState } from "react";
import type { BibleEntry } from "@/lib/bible/api";
import { WLC_BIBLE_ID } from "@/lib/bible/canon";
import { pushCodeLabHistory, readCodeLabHistory } from "@/lib/code-lab/codeLabHistory";
import { loadCorpus, type CorpusLoadProgress } from "@/lib/code-lab/corpusLoader";
import { searchElsAsync } from "@/lib/code-lab/elsWorkerClient";
import { buildMatrixView } from "@/lib/code-lab/matrix";
import { defaultDocumentaryScope, scopeLabel, bookOptions } from "@/lib/code-lab/scope";
import {
  profileForBibleId,
  resolveProfile,
  TEXT_PROFILES,
} from "@/lib/code-lab/textProfiles";
import { formatHitReference } from "@/lib/code-lab/textStream";
import { countSearchSpace, runShuffleControl } from "@/lib/code-lab/statistics";
import type {
  CodeCardData,
  CodeLabScope,
  ElsHit,
  MatrixView,
  TextProfileId,
  TextStream,
} from "@/lib/code-lab/types";

export function useCodeLab(bibleId: string, bibleEntry: BibleEntry | undefined) {
  const [term, setTerm] = useState("");
  const [minSkip, setMinSkip] = useState(1);
  const [maxSkip, setMaxSkip] = useState(100);
  const [scope, setScope] = useState<CodeLabScope>(defaultDocumentaryScope());
  const [compareBibleId, setCompareBibleId] = useState<string | null>(null);
  const [profileOverride, setProfileOverride] = useState<TextProfileId | "auto">("auto");

  const [stream, setStream] = useState<TextStream | null>(null);
  const [compareStream, setCompareStream] = useState<TextStream | null>(null);
  const [hits, setHits] = useState<ElsHit[]>([]);
  const [compareHits, setCompareHits] = useState<ElsHit[]>([]);
  const [selectedHit, setSelectedHit] = useState<ElsHit | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<CorpusLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchCount, setSearchCount] = useState(0);
  const [history, setHistory] = useState<CodeCardData[]>(() => readCodeLabHistory());
  const abortRef = useRef<AbortController | null>(null);

  const languageId = bibleEntry?.language?.id;
  const profile = useMemo(
    () =>
      profileOverride === "auto"
        ? profileForBibleId(bibleId, languageId)
        : resolveProfile(profileOverride, languageId),
    [bibleId, languageId, profileOverride],
  );

  const bookNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of bookOptions()) m[b.abbr] = b.name;
    return m;
  }, []);

  const matrix: MatrixView | null = useMemo(() => {
    if (!stream || !selectedHit) return null;
    return buildMatrixView(stream, selectedHit);
  }, [stream, selectedHit]);

  const controlResult = useMemo(() => {
    if (!stream || !selectedHit || !term.trim()) return null;
    return runShuffleControl(stream, profile, term, selectedHit.skip, selectedHit.direction);
  }, [stream, selectedHit, term, profile]);

  const loadAndSearch = useCallback(async () => {
    if (!bibleId || !term.trim()) {
      setError("Choose a Bible and enter a search term.");
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);
    setHits([]);
    setCompareHits([]);
    setSelectedHit(null);

    const searchOpts = { minSkip, maxSkip, direction: "both" as const };

    try {
      const primary = await loadCorpus({
        bibleId,
        languageId,
        scope,
        signal: ac.signal,
        onProgress: setProgress,
      });
      setStream(primary);

      const found = await searchElsAsync(primary, profile, term, searchOpts);
      setHits(found);
      setSelectedHit(found[0] ?? null);
      setSearchCount((c) => c + countSearchSpace(minSkip, maxSkip, 2));

      if (compareBibleId && compareBibleId !== bibleId) {
        const compareProfile = profileForBibleId(compareBibleId);
        const secondary = await loadCorpus({
          bibleId: compareBibleId,
          scope,
          signal: ac.signal,
        });
        setCompareStream(secondary);
        const compareFound = await searchElsAsync(secondary, compareProfile, term, searchOpts);
        setCompareHits(compareFound);
      } else {
        setCompareStream(null);
        setCompareHits([]);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [bibleId, languageId, scope, term, minSkip, maxSkip, profile, compareBibleId]);

  const applyDocumentaryPreset = useCallback((): string => {
    setScope(defaultDocumentaryScope());
    setMinSkip(16);
    setMaxSkip(16);
    setTerm("");
    setProfileOverride("hebrew-consonants");
    return WLC_BIBLE_ID;
  }, []);

  const buildCodeCard = useCallback((): CodeCardData | null => {
    if (!selectedHit || !stream) return null;
    return {
      bibleId,
      bibleLabel: bibleEntry?.name ?? bibleId,
      profileId: profile.id,
      scope,
      term: profile.normalizeQuery(term),
      hit: selectedHit,
      referenceLabel: formatHitReference(
        stream,
        selectedHit.anchor,
        selectedHit.endAnchor,
        bookNames,
      ),
      createdAt: new Date().toISOString(),
    };
  }, [selectedHit, stream, bibleId, bibleEntry, profile, scope, term, bookNames]);

  const saveToHistory = useCallback(() => {
    const card = buildCodeCard();
    if (!card) return;
    pushCodeLabHistory(card);
    setHistory(readCodeLabHistory());
  }, [buildCodeCard]);

  return {
    term,
    setTerm,
    minSkip,
    setMinSkip,
    maxSkip,
    setMaxSkip,
    scope,
    setScope,
    compareBibleId,
    setCompareBibleId,
    profileOverride,
    setProfileOverride,
    profile,
    stream,
    compareStream,
    hits,
    compareHits,
    selectedHit,
    setSelectedHit,
    matrix,
    loading,
    progress,
    error,
    searchCount,
    controlResult,
    history,
    scopeLabel: scopeLabel(scope),
    loadAndSearch,
    applyDocumentaryPreset,
    buildCodeCard,
    saveToHistory,
    profileOptions: TEXT_PROFILES,
  };
}
