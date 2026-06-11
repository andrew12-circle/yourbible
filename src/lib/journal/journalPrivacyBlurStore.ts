import { create } from "zustand";

export const JOURNAL_PRIVACY_BLUR_STORAGE_KEY = "yb_journal_privacy_blur_v1";

function readPersisted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(JOURNAL_PRIVACY_BLUR_STORAGE_KEY);
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function writePersisted(enabled: boolean) {
  try {
    localStorage.setItem(JOURNAL_PRIVACY_BLUR_STORAGE_KEY, JSON.stringify(enabled));
  } catch {
    /* ignore */
  }
}

interface JournalPrivacyBlurState {
  journalPrivacyBlurEnabled: boolean;
  setJournalPrivacyBlurEnabled: (enabled: boolean) => void;
  toggleJournalPrivacyBlur: () => void;
}

export const useJournalPrivacyBlurStore = create<JournalPrivacyBlurState>((set, get) => ({
  journalPrivacyBlurEnabled: readPersisted(),
  setJournalPrivacyBlurEnabled: (enabled) => {
    writePersisted(enabled);
    set({ journalPrivacyBlurEnabled: enabled });
  },
  toggleJournalPrivacyBlur: () => {
    const next = !get().journalPrivacyBlurEnabled;
    writePersisted(next);
    set({ journalPrivacyBlurEnabled: next });
  },
}));
