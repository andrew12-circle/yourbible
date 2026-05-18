import { create } from "zustand";

export const JOURNAL_LAUNCHER_STORAGE_KEY = "yb_journal_launcher_v1";

export type FloatingJournalRouteArtifact = {
  id: string;
  title: string;
  kind: string;
};

/** Opened from artifact claim "Research with AI" — pre-fills write tab and enables chat tab. */
export type FloatingClaimResearchHandoff = {
  claimId: string;
  artifactId: string;
  claimMarkdown: string;
  journalTitle: string;
  transcriptExcerpt?: string;
  initialTab?: "write" | "chat";
  claimPreview: string;
  matchedBeliefId: string | null;
  artifactTitle: string | null;
};

type LauncherPersist = {
  tucked?: boolean;
};

function readLauncherPersist(): LauncherPersist {
  try {
    const raw = localStorage.getItem(JOURNAL_LAUNCHER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LauncherPersist;
  } catch {
    return {};
  }
}

function writeLauncherTucked(tucked: boolean) {
  try {
    const prev = readLauncherPersist();
    localStorage.setItem(JOURNAL_LAUNCHER_STORAGE_KEY, JSON.stringify({ ...prev, tucked }));
  } catch {
    /* ignore */
  }
}

interface FloatingJournalState {
  panelOpen: boolean;
  routeArtifact: FloatingJournalRouteArtifact | null;
  /** When set, floating journal shows Write + Chat for claim research (cleared on close / "Journal here"). */
  floatingClaimResearch: FloatingClaimResearchHandoff | null;
  /** YouTube artifact page: JS API ready for timestamp inserts. */
  playbackCaptureAvailable: boolean;
  launcherTucked: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setRouteArtifact: (artifact: FloatingJournalRouteArtifact | null) => void;
  setFloatingClaimResearch: (handoff: FloatingClaimResearchHandoff | null) => void;
  setPlaybackCaptureAvailable: (v: boolean) => void;
  setLauncherTucked: (tucked: boolean) => void;
  tuckLauncherFromPanel: () => void;
}

export const useFloatingJournalStore = create<FloatingJournalState>((set) => ({
  panelOpen: false,
  routeArtifact: null,
  floatingClaimResearch: null,
  playbackCaptureAvailable: false,
  launcherTucked:
    typeof window !== "undefined" ? Boolean(readLauncherPersist().tucked) : false,

  setPanelOpen: (open) => set({ panelOpen: open }),

  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  setRouteArtifact: (artifact) => set({ routeArtifact: artifact }),

  setFloatingClaimResearch: (handoff) => set({ floatingClaimResearch: handoff }),

  setPlaybackCaptureAvailable: (v) => set({ playbackCaptureAvailable: v }),

  setLauncherTucked: (tucked) => {
    writeLauncherTucked(tucked);
    set({ launcherTucked: tucked });
  },

  tuckLauncherFromPanel: () => {
    writeLauncherTucked(true);
    set({ launcherTucked: true });
  },
}));
