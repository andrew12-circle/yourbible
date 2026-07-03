import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import {
  buildGlobalMediaHistory,
  enrichGlobalMediaHistoryItem,
  loadGlobalMediaPlayerState,
  mergeWorkbookMediaHistory,
  saveGlobalMediaPlayerState,
} from "@/lib/media/globalMediaPlayer";
import { parseWorshipMusicUrl } from "@/lib/livingHope/worshipMusic";

interface GlobalMediaPlayerState {
  url: string;
  history: WorshipMusicHistoryItem[];
  expanded: boolean;
  active: boolean;
  play: (url: string, options?: { expand?: boolean }) => void;
  stop: () => void;
  setExpanded: (next: boolean) => void;
  toggleExpanded: () => void;
  mergeWorkbookHistory: (workbookHistory: WorshipMusicHistoryItem[]) => void;
  syncWorkbookSelection: (url: string, history: WorshipMusicHistoryItem[]) => void;
}

const GlobalMediaPlayerContext = createContext<GlobalMediaPlayerState | null>(null);

const FALLBACK: GlobalMediaPlayerState = {
  url: "",
  history: [],
  expanded: false,
  active: false,
  play: () => {},
  stop: () => {},
  setExpanded: () => {},
  toggleExpanded: () => {},
  mergeWorkbookHistory: () => {},
  syncWorkbookSelection: () => {},
};

export function useGlobalMediaPlayer() {
  return useContext(GlobalMediaPlayerContext) ?? FALLBACK;
}

function persist(url: string, history: WorshipMusicHistoryItem[], expanded: boolean) {
  saveGlobalMediaPlayerState({ url, history, expanded });
}

export function GlobalMediaPlayerProvider({ children }: { children: ReactNode }) {
  const initial = loadGlobalMediaPlayerState();
  const [url, setUrl] = useState(initial.url);
  const [history, setHistory] = useState(initial.history);
  const [expanded, setExpandedState] = useState(initial.expanded);

  const active = Boolean(url.trim() && parseWorshipMusicUrl(url));

  useEffect(() => {
    persist(url, history, expanded);
  }, [url, history, expanded]);

  const play = useCallback((nextUrl: string, options?: { expand?: boolean }) => {
    const parsed = parseWorshipMusicUrl(nextUrl);
    if (!parsed) return;
    const normalized = parsed.openUrl;
    setUrl(normalized);
    setHistory((prev) => {
      const next = buildGlobalMediaHistory(prev, normalized);
      void enrichGlobalMediaHistoryItem(next, normalized).then(setHistory);
      return next;
    });
    if (options?.expand) setExpandedState(true);
  }, []);

  const stop = useCallback(() => {
    setUrl("");
    setExpandedState(false);
  }, []);

  const setExpanded = useCallback((next: boolean) => {
    setExpandedState(next);
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpandedState((prev) => !prev);
  }, []);

  const mergeWorkbookHistory = useCallback((workbookHistory: WorshipMusicHistoryItem[]) => {
    setHistory((prev) => mergeWorkbookMediaHistory(prev, workbookHistory));
  }, []);

  const syncWorkbookSelection = useCallback((nextUrl: string, workbookHistory: WorshipMusicHistoryItem[]) => {
    const parsed = parseWorshipMusicUrl(nextUrl);
    if (!parsed) return;
    const normalized = parsed.openUrl;
    setHistory((prev) => {
      const next = mergeWorkbookMediaHistory(buildGlobalMediaHistory(prev, normalized), workbookHistory);
      void enrichGlobalMediaHistoryItem(next, normalized).then(setHistory);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      url,
      history,
      expanded,
      active,
      play,
      stop,
      setExpanded,
      toggleExpanded,
      mergeWorkbookHistory,
      syncWorkbookSelection,
    }),
    [url, history, expanded, active, play, stop, setExpanded, toggleExpanded, mergeWorkbookHistory, syncWorkbookSelection],
  );

  return (
    <GlobalMediaPlayerContext.Provider value={value}>
      {children}
    </GlobalMediaPlayerContext.Provider>
  );
}
