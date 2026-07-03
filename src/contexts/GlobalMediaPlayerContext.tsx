import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedStreamRef = useRef("");

  const active = Boolean(url.trim() && parseWorshipMusicUrl(url));

  const radioStreamUrl = useMemo(() => {
    const parsed = url ? parseWorshipMusicUrl(url) : null;
    return parsed?.provider === "radio" ? parsed.streamUrl ?? "" : "";
  }, [url]);

  useEffect(() => {
    persist(url, history);
  }, [url, history]);

  // Load the radio stream into the single persistent <audio> element. Guarding
  // on the loaded URL prevents stacked/echoing playback from repeated mounts.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (loadedStreamRef.current === radioStreamUrl) return;
    loadedStreamRef.current = radioStreamUrl;
    el.pause();
    if (radioStreamUrl) {
      el.src = radioStreamUrl;
      el.load();
    } else {
      el.removeAttribute("src");
      el.load();
    }
  }, [radioStreamUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (radioStreamUrl && playing) void el.play().catch(() => {});
    else el.pause();
  }, [radioStreamUrl, playing]);

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
      {/* Single, app-lifetime radio engine. Never remounts, so streams never stack. */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="none"
        onPlay={() => setPlayingState(true)}
        onPause={() => setPlayingState(false)}
      />
    </GlobalMediaPlayerContext.Provider>
  );
}
