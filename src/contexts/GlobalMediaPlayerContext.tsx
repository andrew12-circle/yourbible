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
  active: boolean;
  /** Reflects the radio <audio> element play state; ignored for iframe embeds. */
  playing: boolean;
  /** The Music page registers a DOM node here so the video embed docks into it. */
  dockEl: HTMLElement | null;
  play: (url: string, options?: { expand?: boolean }) => void;
  stop: () => void;
  setPlaying: (next: boolean) => void;
  togglePlaying: () => void;
  setDockTarget: (el: HTMLElement | null) => void;
  mergeWorkbookHistory: (workbookHistory: WorshipMusicHistoryItem[]) => void;
  syncWorkbookSelection: (url: string, history: WorshipMusicHistoryItem[]) => void;
}

const GlobalMediaPlayerContext = createContext<GlobalMediaPlayerState | null>(null);

const FALLBACK: GlobalMediaPlayerState = {
  url: "",
  history: [],
  active: false,
  playing: false,
  dockEl: null,
  play: () => {},
  stop: () => {},
  setPlaying: () => {},
  togglePlaying: () => {},
  setDockTarget: () => {},
  mergeWorkbookHistory: () => {},
  syncWorkbookSelection: () => {},
};

export function useGlobalMediaPlayer() {
  return useContext(GlobalMediaPlayerContext) ?? FALLBACK;
}

function persist(url: string, history: WorshipMusicHistoryItem[]) {
  saveGlobalMediaPlayerState({ url, history, expanded: false });
}

export function GlobalMediaPlayerProvider({ children }: { children: ReactNode }) {
  const initial = loadGlobalMediaPlayerState();
  const [url, setUrl] = useState(initial.url);
  const [history, setHistory] = useState(initial.history);
  const [playing, setPlayingState] = useState(false);
  const [dockEl, setDockEl] = useState<HTMLElement | null>(null);

  const active = Boolean(url.trim() && parseWorshipMusicUrl(url));

  useEffect(() => {
    persist(url, history);
  }, [url, history]);

  const play = useCallback((nextUrl: string) => {
    const parsed = parseWorshipMusicUrl(nextUrl);
    if (!parsed) return;
    const normalized = parsed.openUrl;
    setUrl(normalized);
    setPlayingState(true);
    setHistory((prev) => {
      const next = buildGlobalMediaHistory(prev, normalized);
      void enrichGlobalMediaHistoryItem(next, normalized).then(setHistory);
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    setUrl("");
    setPlayingState(false);
  }, []);

  const setPlaying = useCallback((next: boolean) => {
    setPlayingState(next);
  }, []);

  const togglePlaying = useCallback(() => {
    setPlayingState((prev) => !prev);
  }, []);

  const setDockTarget = useCallback((el: HTMLElement | null) => {
    setDockEl(el);
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
      active,
      playing,
      dockEl,
      play,
      stop,
      setPlaying,
      togglePlaying,
      setDockTarget,
      mergeWorkbookHistory,
      syncWorkbookSelection,
    }),
    [
      url,
      history,
      active,
      playing,
      dockEl,
      play,
      stop,
      setPlaying,
      togglePlaying,
      setDockTarget,
      mergeWorkbookHistory,
      syncWorkbookSelection,
    ],
  );

  return (
    <GlobalMediaPlayerContext.Provider value={value}>
      {children}
    </GlobalMediaPlayerContext.Provider>
  );
}
