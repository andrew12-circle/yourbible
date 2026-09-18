import { create } from "zustand";
import { prepareJournalPrivacyLock } from "@/lib/journal/journalPrivacyLifecycle";
let lockingFlight: Promise<void> | null = null;
import type { JournalCryptoRecord } from "@/lib/crypto/journalVaultCrypto";

type JournalVaultState = {
  /** Profile flag — user opted into E2E journaling. */
  e2eEnabled: boolean;
  /** Journal IDs that always require ciphertext (e.g. Private notebook). */
  e2eRequiredJournalIds: Set<string>;
  /** Crypto row loaded from Supabase (wrapped DEK only). */
  cryptoRecord: JournalCryptoRecord | null;
  /** Unwrapped data encryption key — memory only, never persisted. */
  dek: CryptoKey | null;
  /** Device-local 6-digit PIN configured (IndexedDB). */
  pinEnabled: boolean;
  /** WebAuthn biometric unlock configured on this device. */
  biometricEnabled: boolean;
  setE2eEnabled: (enabled: boolean) => void;
  setE2eRequiredJournalIds: (ids: Set<string>) => void;
  setCryptoRecord: (record: JournalCryptoRecord | null) => void;
  setLockFlags: (flags: { pinEnabled?: boolean; biometricEnabled?: boolean }) => void;
  unlock: (dek: CryptoKey) => void;
  locking: boolean;
  lockEpoch: number;
  lock: () => Promise<void>;
  reset: () => Promise<void>;
};

export const useJournalVaultStore = create<JournalVaultState>((set, get) => ({
  locking: false,
  lockEpoch: 0,
  e2eEnabled: false,
  e2eRequiredJournalIds: new Set(),
  cryptoRecord: null,
  dek: null,
  pinEnabled: false,
  biometricEnabled: false,
  setE2eEnabled: (enabled) => set({ e2eEnabled: enabled }),
  setE2eRequiredJournalIds: (ids) => set({ e2eRequiredJournalIds: ids }),
  setCryptoRecord: (record) => set({ cryptoRecord: record }),
  setLockFlags: (flags) =>
    set((s) => ({
      pinEnabled: flags.pinEnabled ?? s.pinEnabled,
      biometricEnabled: flags.biometricEnabled ?? s.biometricEnabled,
    })),
  unlock: (dek) => {
    if (get().locking) throw new Error("Wait for your journal to finish locking.");
    set({ dek });
  },
  lock: () => {
    if (lockingFlight) return lockingFlight;
    // Guards synchronously capture edits and pause writers before the UI unmounts.
    const pending = prepareJournalPrivacyLock();
    set({ locking: true });
    lockingFlight = pending.then(() => {
      set({ dek: null, locking: false, lockEpoch: get().lockEpoch + 1 });
    }, (error: unknown) => {
      // Never discard the only recoverable draft or claim a failed lock succeeded.
      set({ locking: false });
      throw error;
    }).finally(() => { lockingFlight = null; });
    return lockingFlight;
  },
  reset: async () => {
    await get().lock();
    set({
      e2eEnabled: false,
      e2eRequiredJournalIds: new Set(),
      cryptoRecord: null,
      dek: null,
      pinEnabled: false,
      biometricEnabled: false,
    });
  },
}));

export function isJournalE2eEnabled(): boolean {
  return useJournalVaultStore.getState().e2eEnabled;
}

export function isJournalVaultUnlocked(): boolean {
  return useJournalVaultStore.getState().dek != null;
}

export function getJournalDek(): CryptoKey | null {
  return useJournalVaultStore.getState().dek;
}
